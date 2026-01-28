import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OpDept } from '@app/entities/core/common-business/op-dept.entity';
import { OpDeptClosure } from '@app/entities/core/common-business/op-dept-closure.entity';
import { BizError } from '@app/core/BizError';
import { snowflakeIdGenerator } from '@app/common/utils/id';
import { OpUser } from '@app/entities';

export interface ICreateOpDeptParams {
  name: string;
  parentDeptId?: string;
  orderIndex?: number;
  createdBy?: string;
}

export interface IUpdateOpDeptParams {
  name?: string;
  orderIndex?: number;
  parentDeptId?: string;
}

@Injectable()
export class OpDeptSharedService {
  constructor(
    @InjectRepository(OpDept)
    private readonly deptRepository: Repository<OpDept>,
    @InjectRepository(OpDeptClosure)
    private readonly closureRepository: Repository<OpDeptClosure>,
    @InjectRepository(OpUser)
    private readonly opUserRepository: Repository<OpUser>,
  ) {}

  /**
   * 创建部门并维护闭包表和 idPath
   */
  async createDept(
    params: ICreateOpDeptParams,
    manager?: EntityManager,
  ): Promise<OpDept> {
    if (!params.name) throw new BizError('部门名称不能为空').codeAs(40002);
    const { name, parentDeptId, orderIndex = 0, createdBy } = params;
    const em = manager || this.deptRepository.manager;

    // 1. 获取父部门信息计算 depth 和 idPath
    let depth = 0;
    let parentIdPath = '';

    if (parentDeptId) {
      const parent = await em.findOne(OpDept, {
        where: { id: parentDeptId },
      });
      if (parent) {
        depth = parent.depth + 1;
        parentIdPath = parent.idPath;
      } else {
        throw new BizError('父部门不存在').codeAs(40401);
      }
    }

    // 2. 提前生成 ID 并计算 idPath
    const deptId = snowflakeIdGenerator.nextId().toString();
    const idPath = parentIdPath ? `${parentIdPath},${deptId}` : deptId;

    // 3. 创建部门实例并直接保存
    const dept = em.create(OpDept, {
      id: deptId,
      parentDeptId,
      name,
      depth,
      idPath,
      orderIndex,
      createdBy,
    });

    const savedDept = await em.save(dept);

    // 4. 同步闭包表
    await this.syncClosureTable(savedDept, em);

    return savedDept;
  }

  /**
   * 更新部门信息
   */
  async updateDept(
    id: string,
    params: IUpdateOpDeptParams,
    manager?: EntityManager,
  ): Promise<OpDept> {
    if (!id) throw new BizError('部门ID不能为空').codeAs(40001);
    const em = manager || this.deptRepository.manager;
    const dept = await em.findOne(OpDept, { where: { id } });
    if (!dept) {
      throw new BizError('部门不存在').codeAs(40400);
    }

    const { name, orderIndex, parentDeptId } = params;

    // 不允许修改父部门
    if (parentDeptId !== undefined && parentDeptId !== dept.parentDeptId) {
      throw new BizError('暂不支持修改父部门，如需调整请删除后重新创建').codeAs(
        40003,
      );
    }

    if (name !== undefined) dept.name = name;
    if (orderIndex !== undefined) dept.orderIndex = orderIndex;

    const saved = await em.save(dept);

    // 冗余同步闭包表
    await this.syncClosureTable(saved, em);

    return saved;
  }

  /**
   * 基于 idPath 强制同步闭包表关联
   */
  private async syncClosureTable(
    dept: OpDept,
    em: EntityManager,
  ): Promise<void> {
    const { id, idPath } = dept;
    const ancestorIds = idPath.split(',');

    // 1. 清理该节点作为后代的旧记录
    await em.delete(OpDeptClosure, { descendantDeptId: id });

    // 2. 根据 idPath 构造新的记录
    const closureEntries = ancestorIds.map((ancestorId, index) => ({
      ancestorDeptId: ancestorId,
      descendantDeptId: id,
      distance: ancestorIds.length - 1 - index,
    }));

    if (closureEntries.length > 0) {
      await em.insert(OpDeptClosure, closureEntries);
    }
  }

  /**
   * 删除部门 (带引用检查)
   */
  async deleteDept(id: string, manager?: EntityManager): Promise<void> {
    const em = manager || this.deptRepository.manager;
    const dept = await em.findOne(OpDept, { where: { id } });
    if (!dept) {
      throw new BizError('部门不存在').codeAs(40400);
    }

    // 1. 检查是否有子部门
    const childCount = await em.count(OpDept, {
      where: { parentDeptId: id },
    });
    if (childCount > 0) {
      throw new BizError('该部门存在下级部门，无法删除').codeAs(40011);
    }

    // 2. 检查是否有用户关联
    const userCount = await em.count(OpUser, { where: { deptId: id } });
    if (userCount > 0) {
      throw new BizError('该部门下存在用户，无法删除').codeAs(40012);
    }

    // 3. 执行删除
    // 3.1 删除闭包表关联
    await em.delete(OpDeptClosure, [
      { ancestorDeptId: id },
      { descendantDeptId: id },
    ]);

    // 3.2 删除部门本身
    await em.delete(OpDept, { id });
  }

  /**
   * 查询所有部门
   */
  async findDeptList(
    params: { name?: string; limit?: number } = {},
  ): Promise<OpDept[]> {
    const { name, limit } = params;
    const qb = this.deptRepository.createQueryBuilder('dept');

    if (name) {
      qb.andWhere('dept.name LIKE :name', { name: `%${name}%` });
    }

    qb.leftJoinAndSelect('dept.creator', 'creator')
      .leftJoinAndSelect('creator.opAccount', 'creatorAccount')
      .orderBy('dept.idPath', 'ASC');

    if (limit && limit > 0) {
      qb.take(limit);
    }

    return await qb.getMany();
  }

  /**
   * 获取部门详情
   */
  async findOneDept(id: string): Promise<OpDept> {
    const dept = await this.deptRepository.findOne({
      where: { id },
      relations: ['creator', 'creator.opAccount'],
    });
    if (!dept) throw new BizError('部门不存在').codeAs(40400);
    return dept;
  }

  /**
   * 获取部门简单列表 (ID and Name only)
   */
  async findDeptSimpleList(): Promise<OpDept[]> {
    return await this.deptRepository.find({
      select: ['id', 'name'],
      order: { idPath: 'ASC' },
    });
  }

  /**
   * 获取默认部门
   * 策略: 优先查找 isDefault=true 的部门,否则返回创建时间最早的部门
   */
  async findDefaultDept(): Promise<OpDept | null> {
    // 1. 尝试查找标记为默认的部门
    const defaultDept = await this.deptRepository.findOne({
      where: { isDefault: true },
    });

    if (defaultDept) {
      return defaultDept;
    }

    // 2. 如果没有标记的默认部门,返回创建时间最早的部门
    return await this.deptRepository.findOne({
      order: { createdAt: 'ASC' },
    });
  }
}
