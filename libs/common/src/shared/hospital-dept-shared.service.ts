import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { HospitalDept } from '@app/entities/auth/hospital-dept.entity';
import { HospitalDeptClosure } from '@app/entities/auth/hospital-dept-closure.entity';
import { HospitalAdmin } from '@app/entities/account/hospital-admin.entity';
import { Student } from '@app/entities/account/student.entity';
import { BizError } from '@app/core/BizError';
import { snowflakeIdGenerator } from '@app/common/utils/id';
import { treeify } from '@app/common/utils/tree';

export interface ICreateHospitalDeptParams {
  name: string;
  parentDeptId?: string;
  orderIndex?: number;
  operatorId?: string;
}

export interface IUpdateHospitalDeptParams {
  name?: string;
  orderIndex?: number;
  parentDeptId?: string;
  operatorId?: string;
}

@Injectable()
export class HospitalDeptSharedService {
  constructor(
    @InjectRepository(HospitalDept)
    private readonly deptRepository: Repository<HospitalDept>,
    @InjectRepository(HospitalDeptClosure)
    private readonly closureRepository: Repository<HospitalDeptClosure>,
    @InjectRepository(HospitalAdmin)
    private readonly adminRepository: Repository<HospitalAdmin>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /**
   * 创建部门并维护闭包表和 idPath
   */
  async createDept(
    hospitalId: string,
    params: ICreateHospitalDeptParams,
    manager?: EntityManager,
  ): Promise<HospitalDept> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    if (!params.name) throw new BizError('部门名称不能为空').codeAs(40002);
    const { name, parentDeptId, orderIndex = 0, operatorId } = params;
    const em = manager || this.deptRepository.manager;

    // 1. 获取父部门信息计算 depth 和 idPath
    let depth = 0;
    let parentIdPath = '';

    if (parentDeptId) {
      const parent = await em.findOne(HospitalDept, {
        where: { id: parentDeptId, hospitalId },
      });
      if (parent) {
        depth = parent.depth + 1;
        parentIdPath = parent.idPath;
      } else {
        throw new BizError('父部门不存在').codeAs(40401);
      }
    }

    // 2. 提前生成 ID 并计算 idPath (核心优化：避免 idPath 占位引发的唯一索引冲突)
    const deptId = snowflakeIdGenerator.nextId().toString();
    const idPath = parentIdPath ? `${parentIdPath},${deptId}` : deptId;

    // 3. 创建部门实例并直接保存
    const dept = em.create(HospitalDept, {
      id: deptId,
      hospitalId,
      parentDeptId,
      name,
      depth,
      idPath,
      orderIndex,
      createdBy: operatorId,
      updatedBy: operatorId,
    });

    const savedDept = await em.save(dept);

    // 4. 同步闭包表 (Ensure 逻辑)
    await this.syncClosureTable(savedDept, em);

    return savedDept;
  }

  /**
   * 更新部门信息
   */
  async updateDept(
    id: string,
    params: IUpdateHospitalDeptParams,
    manager?: EntityManager,
  ): Promise<HospitalDept> {
    if (!id) throw new BizError('部门ID不能为空').codeAs(40001);
    const em = manager || this.deptRepository.manager;
    const dept = await em.findOne(HospitalDept, { where: { id } });
    if (!dept) {
      throw new BizError('部门不存在').codeAs(40400);
    }

    if (!dept) {
      throw new BizError('部门不存在').codeAs(40400);
    }

    const { name, orderIndex, parentDeptId, operatorId } = params;

    // 不允许修改父部门，逻辑简化为仅校验
    if (parentDeptId !== undefined && parentDeptId !== dept.parentDeptId) {
      throw new BizError('暂不支持修改父部门，如需调整请删除后重新创建').codeAs(
        40003,
      );
    }

    if (name !== undefined) dept.name = name;
    if (orderIndex !== undefined) dept.orderIndex = orderIndex;
    if (operatorId) dept.updatedBy = operatorId;

    const saved = await em.save(dept);

    // 冗余同步闭包表，确保数据一致性 (自愈)
    await this.syncClosureTable(saved, em);

    return saved;
  }

  /**
   * 基于 idPath 强制同步闭包表关联
   * 这保证了即使父节点之前没有维护闭包表，当前节点只要有 idPath，就能找回它的所有祖先
   */
  private async syncClosureTable(
    dept: HospitalDept,
    em: EntityManager,
  ): Promise<void> {
    const { id, idPath, hospitalId } = dept;
    const ancestorIds = idPath.split(',');

    // 1. 清理该节点作为后代的旧记录 (防止重复)
    await em.delete(HospitalDeptClosure, { descendantDeptId: id });

    // 2. 根据 idPath 构造新的记录
    // 假设 idPath = A/B/C，则生成：A->C(2), B->C(1), C->C(0)
    const closureEntries = ancestorIds.map((ancestorId, index) => ({
      hospitalId,
      ancestorDeptId: ancestorId,
      descendantDeptId: id,
      distance: ancestorIds.length - 1 - index,
    }));

    if (closureEntries.length > 0) {
      await em.insert(HospitalDeptClosure, closureEntries);
    }
  }

  /**
   * 删除部门 (带引用检查)
   */
  async deleteDept(
    id: string,
    operatorId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager || this.deptRepository.manager;
    const dept = await em.findOne(HospitalDept, { where: { id } });
    if (!dept) {
      throw new BizError('部门不存在').codeAs(40400);
    }

    // 1. 检查是否有子部门
    const childCount = await em.count(HospitalDept, {
      where: { parentDeptId: id },
    });
    if (childCount > 0) {
      throw new BizError('该部门存在下级部门，无法删除').codeAs(40011);
    }

    // 2. 检查是否有医院管理员关联
    const adminCount = await em.count(HospitalAdmin, { where: { deptId: id } });
    if (adminCount > 0) {
      throw new BizError('该部门下存医院管理员，无法删除').codeAs(40012);
    }

    // 3. 检查是否有学生关联
    const studentCount = await em.count(Student, { where: { deptId: id } });
    if (studentCount > 0) {
      throw new BizError('该部门下存在学生，无法删除').codeAs(40013);
    }

    // 4. 更新删除人
    if (operatorId) {
      dept.updatedBy = operatorId;
      await em.save(dept);
    }

    // 5. 执行删除
    // 5.1 删除闭包表关联
    await em.delete(HospitalDeptClosure, [
      { ancestorDeptId: id },
      { descendantDeptId: id },
    ]);

    // 5.2 删除部门本身
    await em.delete(HospitalDept, { id });
  }

  /**
   * 查询医院所有部门
   */
  async findDeptsByHospitalId(
    hospitalId: string,
    params: { name?: string; limit?: number } = {},
  ): Promise<HospitalDept[]> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    const { name, limit } = params;
    const qb = this.deptRepository.createQueryBuilder('dept');
    qb.where('dept.hospitalId = :hospitalId', { hospitalId });

    if (name) {
      qb.andWhere('dept.name LIKE :name', { name: `%${name}%` });
    }

    qb.leftJoinAndSelect('dept.creator', 'creator')
      .leftJoinAndSelect('creator.hospitalAdmin', 'creatorAdmin')
      .leftJoinAndSelect('creator.opUser', 'creatorOpUser')
      .orderBy('dept.idPath', 'ASC');

    if (limit && limit > 0) {
      qb.take(limit);
    }

    return await qb.getMany();
  }

  /**
   * 获取部门详情
   */
  async findOneDept(hospitalId: string, id: string): Promise<HospitalDept> {
    const dept = await this.deptRepository.findOne({
      where: { id, hospitalId },
      relations: [
        'creator',
        'creator.account',
        'creator.hospitalAdmin',
        'creator.opUser',
      ],
    });
    if (!dept) throw new BizError('部门不存在').codeAs(40400);
    return dept;
  }

  /**
   * 获取医院部门简单列表 (ID and Name only)
   */
  async findDeptSimpleList(hospitalId: string): Promise<HospitalDept[]> {
    return await this.deptRepository.find({
      where: { hospitalId },
      select: ['id', 'name', 'parentDeptId'],
      order: { idPath: 'ASC' },
    });
  }

  /**
   * 获取医院部门树
   */
  async findDeptTreeByHospitalId(
    hospitalId: string,
    params: { name?: string } = {},
  ): Promise<HospitalDept[]> {
    const departments = await this.findDeptsByHospitalId(hospitalId, {
      ...params,
      limit: 0,
    });
    return treeify(departments, 'id', 'parentDeptId');
  }

  /**
   * 获取医院部门简单树
   */
  async findDeptSimpleTree(hospitalId: string): Promise<HospitalDept[]> {
    const departments = await this.findDeptSimpleList(hospitalId);
    return treeify(departments, 'id', 'parentDeptId');
  }

  /**
   * 获取医院的默认部门
   */
  async findDefaultDept(hospitalId: string): Promise<HospitalDept | null> {
    return await this.deptRepository.findOne({
      where: { hospitalId, isDefault: true },
    });
  }

  /**
   * 内部方法: 创建默认部门 (仅供系统内部调用,如创建医院时)
   */
  async createDefaultDept(
    hospitalId: string,
    params: Omit<ICreateHospitalDeptParams, 'isDefault'>,
    manager?: EntityManager,
  ): Promise<HospitalDept> {
    const em = manager || this.deptRepository.manager;

    // 检查是否已存在默认部门
    const existingDefault = await em.findOne(HospitalDept, {
      where: { hospitalId, isDefault: true },
    });
    if (existingDefault) {
      throw new BizError('该医院已存在默认部门').codeAs(40009);
    }

    // 创建部门
    const dept = await this.createDept(hospitalId, params, em);
    // 强制设置为默认部门
    dept.isDefault = true;
    return await em.save(dept);
  }
}
