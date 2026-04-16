import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  SelectQueryBuilder,
  Brackets,
  ObjectLiteral,
} from 'typeorm';
import { ScopeStrategy } from '@thomas/nestjs/entities/core/base/extendable';

const DEFAULT_CLOSURE_TABLE_NAME = 'op_dept_closure';

/**
 * 数据范围引擎，通过挂载到现有queryBuilder上使用
 */
@Injectable()
export class DataScopeEngine {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * 应用数据范围
   * @param options
   * @returns
   */
  apply<T extends ObjectLiteral>(options: {
    // 搜索queryBuilder
    qb: SelectQueryBuilder<T>;
    // 搜索人
    searcher: { identityId: string; deptId: string };
    // 闭包表名称
    closureTableName?: string;
  }): SelectQueryBuilder<T> {
    const { qb, searcher } = options;
    const alias = qb.expressionMap.mainAlias!.name;

    const closureAlias = options.closureTableName || DEFAULT_CLOSURE_TABLE_NAME;

    qb.andWhere(
      new Brackets((root) => {
        // 🔴 兜底规则：自己创建的永远可见
        root.orWhere(`${alias}.scopeCreatorId = :userId`, {
          userId: searcher.identityId,
        });

        // ===== 以下是原有 ScopeStrategy 规则 =====

        root.orWhere(`${alias}.scopeStrategy = :all`, {
          all: ScopeStrategy.ALL,
        });

        root.orWhere(
          new Brackets((b) =>
            b
              .where(`${alias}.scopeStrategy = :self`, {
                self: ScopeStrategy.SELF,
              })
              .andWhere(`${alias}.scopeCreatorId = :userId`, {
                userId: searcher.identityId,
              }),
          ),
        );

        root.orWhere(
          new Brackets((b) =>
            b
              .where(`${alias}.scopeStrategy = :deptOnly`, {
                deptOnly: ScopeStrategy.DEPT_ONLY,
              })
              .andWhere(`${alias}.scopeDeptId = :userDeptId`, {
                userDeptId: searcher.deptId,
              }),
          ),
        );

        root.orWhere(
          new Brackets((b) =>
            b
              .where(`${alias}.scopeStrategy = :deptChildren`, {
                deptChildren: ScopeStrategy.DEPT_AND_CHILDREN,
              })
              .andWhere(
                `EXISTS (
              ${this.ds
                .getRepository(closureAlias)
                .createQueryBuilder('dc')
                .select('1')
                .where(`dc.ancestor_dept_id = ${alias}.scopeDeptId`)
                .andWhere('dc.descendant_dept_id = :userDeptId')
                .getQuery()}
            )`,
                { userDeptId: searcher.deptId },
              ),
          ),
        );
      }),
    );

    return qb;
  }
}
