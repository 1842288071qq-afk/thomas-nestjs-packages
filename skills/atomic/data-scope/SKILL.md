---
name: data-scope
description: 通过 WithScopeStrategy Mixin 给实体加数据范围字段，Service 用 DataScopeEngine.apply 实现 SELF/DEPT_ONLY/DEPT_AND_CHILDREN/ALL 行级过滤。
type: atomic
tags: [data-scope, dept, rbac, row-level, scope-strategy]
---

# 数据范围权限

行级数据隔离机制，与功能权限（`permission-rbac`）正交。

## 实体定义

通过 Mixin 给实体加 `scope_strategy` / `scope_dept_id` / `scope_creator_id`：

```typescript
import { WithScopeStrategy, EntityWithIdAndTimeTrace } from '@libs/entities/base/extendable';

@Entity()
export class CustomSubject extends WithScopeStrategy(EntityWithIdAndTimeTrace) {
  @Column() name: string;
}
```

通常与 `WithAuditor` Mixin 一起使用以自动追踪创建人。

## 策略枚举

| 策略 | 含义 |
| - | - |
| `ALL` | 全局可见，无额外过滤 |
| `SELF` | 仅 `scope_creator_id == 当前用户 id` |
| `DEPT_ONLY` | 仅 `scope_dept_id == 当前用户部门 id` |
| `DEPT_AND_CHILDREN` | 当前部门或其子部门（依赖 `dept_closure` 闭包表） |

兜底：**记录的创建者永远对该记录可见**，无论策略。

## Service 中应用

```typescript
@Injectable()
export class XxxService {
  constructor(
    private readonly dataScopeEngine: DataScopeEngine,
    @InjectRepository(CustomSubject) private readonly repo: Repository<CustomSubject>,
  ) {}

  async getPage(hospitalId: string, user: { id: string; deptId: string }, page: number, pageSize: number) {
    const qb = this.repo.createQueryBuilder('e').where('e.hospitalId = :hospitalId', { hospitalId });

    this.dataScopeEngine.apply({ qb, searcher: { id: user.id, deptId: user.deptId } });

    const [rows, total] = await qb.orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { rows, total, page, pageSize };
  }
}
```

`searcher` 必须由 Controller 显式传入，不在 Service 内读 ALS（参见 `service-paradigm`）。

## 相关 skill

- `service-paradigm` — searcher 由上层显式传入
- `entity-base` — Mixin 与基类组合
- `permission-rbac` — 与功能权限配合
