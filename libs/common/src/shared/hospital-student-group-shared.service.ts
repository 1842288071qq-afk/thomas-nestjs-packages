import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, In } from 'typeorm';
import { StudentGroup } from '@app/entities/account/student-group.entity';
import { StudentGroupRelation } from '@app/entities/account/student-group-relation.entity';
import { Student } from '@app/entities/account/student.entity';
import { BizError } from '@app/core/BizError';
import { IPageData } from '@app/core/Pagination';

export interface IManageStudentGroupParams {
  id?: string;
  name?: string;
  description?: string;
  operatorId?: string;
}

@Injectable()
export class HospitalStudentGroupSharedService {
  private readonly logger = new Logger(HospitalStudentGroupSharedService.name);

  constructor(
    @InjectRepository(StudentGroup)
    private readonly groupRepository: Repository<StudentGroup>,
    @InjectRepository(StudentGroupRelation)
    private readonly relationRepository: Repository<StudentGroupRelation>,
  ) {}

  /**
   * 创建或更新学生群组
   */
  async manageStudentGroup(
    hospitalId: string,
    params: IManageStudentGroupParams,
    manager?: EntityManager,
  ): Promise<StudentGroup> {
    if (!hospitalId && !params.id) {
      throw new BizError('医院ID不能为空').codeAs(40001);
    }

    const em = manager || this.groupRepository.manager;

    return await em.transaction(async (trx) => {
      const { id, name, description, operatorId } = params;

      let group: StudentGroup;
      if (id) {
        const existing = await trx.findOne(StudentGroup, {
          where: { id },
        });
        if (!existing) throw new BizError('群组不存在').codeAs(40400);
        if (hospitalId && existing.hospitalId !== hospitalId) {
          throw new BizError('无权操作该医院的群组').codeAs(40301);
        }
        group = existing;
      } else {
        if (!name) throw new BizError('群组名称不能为空').codeAs(40002);
        group = trx.create(StudentGroup, {
          hospitalId,
        });
      }

      if (name !== undefined) group.name = name;
      if (description !== undefined) group.description = description;

      if (!id) {
        group.createdBy = operatorId;
      }
      group.updatedBy = operatorId;

      const result = await trx.save(group);
      if (!result) throw new BizError('保存群组失败').codeAs(50001);
      return result;
    });
  }

  /**
   * 删除学生群组
   */
  async deleteStudentGroup(
    hospitalId: string,
    id: string,
    operatorId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager || this.groupRepository.manager;

    await em.transaction(async (trx) => {
      const existing = await trx.findOne(StudentGroup, {
        where: { id, hospitalId },
      });
      if (!existing) return;

      if (operatorId) {
        existing.updatedBy = operatorId;
        await trx.save(existing);
      }

      // 软删除群组
      await trx.softRemove(existing);
      // 注意：级联删除关联关系由数据库约束或显式处理
      // 这里我们显式删除关联关系（由于关联关系表通常不设软删除，或者根据业务决定）
      await trx.delete(StudentGroupRelation, { groupId: id });
    });
  }

  /**
   * 向群组添加学生
   */
  async addStudentsToGroup(
    hospitalId: string,
    groupId: string,
    studentIds: string[],
    operatorId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager || this.relationRepository.manager;

    await em.transaction(async (trx) => {
      const group = await trx.findOne(StudentGroup, {
        where: { id: groupId, hospitalId },
      });
      if (!group) throw new BizError('群组不存在').codeAs(40400);

      // 验证学生是否属于该医院
      const students = await trx.find(Student, {
        where: { id: In(studentIds), hospitalId },
      });

      const foundIds = students.map((s) => s.id);
      const invalidIds = studentIds.filter((id) => !foundIds.includes(id));
      if (invalidIds.length > 0) {
        throw new BizError(
          `学生ID ${invalidIds.join(',')} 不属于该医院`,
        ).codeAs(40003);
      }

      // 批量创建关联，忽略已存在的（unique index 会保护）
      // TypeORM 没有内置的 'INSERT IGNORE'，我们可以先查再增，或者使用 queryBuilder
      for (const studentId of studentIds) {
        const existing = await trx.findOne(StudentGroupRelation, {
          where: { groupId, studentId },
        });
        if (!existing) {
          const rel = trx.create(StudentGroupRelation, {
            groupId,
            studentId,
            createdBy: operatorId,
            updatedBy: operatorId,
          });
          await trx.save(rel);
        }
      }
    });
  }

  /**
   * 从群组移除学生
   */
  async removeStudentsFromGroup(
    hospitalId: string,
    groupId: string,
    studentIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager || this.relationRepository.manager;

    await em.transaction(async (trx) => {
      const group = await trx.findOne(StudentGroup, {
        where: { id: groupId, hospitalId },
      });
      if (!group) throw new BizError('群组不存在').codeAs(40400);

      await trx.delete(StudentGroupRelation, {
        groupId,
        studentId: In(studentIds),
      });
    });
  }

  /**
   * 分页查询群组
   */
  async findStudentGroupPage(params: {
    hospitalId: string;
    name?: string;
    page: number;
    pageSize: number;
  }): Promise<IPageData<StudentGroup>> {
    const { hospitalId, name, page, pageSize } = params;

    const qb = this.groupRepository
      .createQueryBuilder('group')
      .where('group.hospitalId = :hospitalId', { hospitalId })
      .andWhere('group.deletedAt IS NULL');

    if (name) {
      qb.andWhere('group.name LIKE :name', { name: `%${name}%` });
    }

    const [rows, total] = await qb
      .loadRelationCountAndMap('group.studentCount', 'group.studentRelations')
      .orderBy('group.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { rows, total, page, pageSize };
  }

  /**
   * 获取群组详情
   */
  async findOneGroup(hospitalId: string, id: string): Promise<StudentGroup> {
    const group = await this.groupRepository
      .createQueryBuilder('group')
      .loadRelationCountAndMap('group.studentCount', 'group.studentRelations')
      .where('group.id = :id', { id })
      .andWhere('group.hospitalId = :hospitalId', { hospitalId })
      .getOne();
    if (!group) throw new BizError('群组不存在').codeAs(40400);
    return group;
  }

  /**
   * 分页查询群组下的学生
   */
  async findStudentsInGroupPage(params: {
    hospitalId: string;
    groupId: string;
    name?: string;
    page: number;
    pageSize: number;
  }): Promise<IPageData<Student>> {
    const { hospitalId, groupId, name, page, pageSize } = params;

    // 验证群组权限
    const group = await this.groupRepository.findOne({
      where: { id: groupId, hospitalId },
    });
    if (!group) throw new BizError('群组不存在').codeAs(40400);

    const qb = this.relationRepository
      .createQueryBuilder('rel')
      .innerJoinAndSelect('rel.student', 'student')
      .leftJoinAndSelect('student.dept', 'dept')
      .where('rel.groupId = :groupId', { groupId })
      .andWhere('student.deletedAt IS NULL');

    if (name) {
      qb.andWhere('student.name LIKE :name', { name: `%${name}%` });
    }

    const [rows, total] = await qb
      .orderBy('rel.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      rows: rows.map((rel) => rel.student),
      total,
      page,
      pageSize,
    };
  }
}
