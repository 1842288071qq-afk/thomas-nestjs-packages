# GitHub 迁移与公司字眼脱敏 设计文档

- 日期：2026-07-27
- 作者：claude
- 状态：已确认

## 1. 背景与目标

当前项目托管在公司私有 GitLab（`https://thomas-coding.ksbao.com/group-thomas/project-boilerplate/thomas-nestjs-packages.git`），npm scope 为 `@thomas/nestjs`，描述为 "thomas NestJS Boilerplate & Shared Libraries"。代码、配置、文档、git 提交历史中广泛存在 `thomas`、`thomas` 公司字眼。

目标：

1. 将项目迁移到 GitHub 公开仓库。
2. 清除当前代码与**全部 git 历史**中的 `thomas`/`thomas` 公司字眼，替换为通用开源名。
3. 新名称用 GitHub 用户名/组织名作为占位符 `<github-user>`，迁移前由用户填入实际值。

## 2. 范围

### 2.1 替换映射表

| 旧值 | 新值 | 影响位置 |
|---|---|---|
| `@thomas/nestjs` | `@<github-user>/nestjs` | package.json `name`；tsconfig.json `paths`；源码 import（约 233 处）；skills 文档 |
| `thomas` | `<github-user>` | 文档/描述中独立连字符形式 |
| `thomas` / `thomas` | `<github-user>` | package.json `description`；README；AGENTS.md 标题；skills/README.md |
| `thomas-nestjs-packages` | `<github-user>-nestjs-packages` | 仓库名、remote URL |
| `thomas-nestjs-skills` | `<github-user>-nestjs-skills` | skills 引用 |
| `.tmp-codex-skills/thomas/` | `.tmp-codex-skills/<github-user>/` | AGENTS.md 中生成的路径 |
| `nestjs:health-indicator` | `nestjs:health-indicator` | `libs/core/src/nest/health/health.constants.ts`（内部 metadata 字符串，自包含，安全） |

### 2.2 保护项（不动）

- `public/dict.json` 中的 `"value": "kqyy"`（文本 `口腔医院`，"口腔医院"拼音缩写，属业务数据，非公司名）
- 文档占位示例：`xxx-module`、`XXX_USER`、`xxx-permission`、`xxx-permission.service.ts`
- 用户确认 `xx` 仅占位示例，无需处理

## 3. 方案选择

**方案 A（已选）：工作区改名 + filter-repo 重写历史**

1. 先在工作区按映射表做文本替换
2. 跑 build + test 验证改名不破坏构建
3. 用同一映射表通过 `git filter-repo --replace-text` 重写全历史

理由：先在工作区验证可降低风险；用同一映射表扩展到全历史，保证一致性。

## 4. 执行步骤

1. 新建分支 `claude/feat/github-migration`
2. 安装 `git-filter-repo`（`pip install git-filter-repo`），确认 `git filter-repo --version` 可用
3. 工作区文本替换（按映射表，排除保护项）：
   - `package.json`：`name`、`description`、`author`、`repository` 字段
   - `tsconfig.json`：`paths` 中所有 `@thomas/nestjs/*` 键
   - 源码 import：所有 `@thomas/nestjs/...` 引用（libs、apps）
   - `README.md`、`AGENTS.md`、`CLAUDE.md`（如有）、`.trae/rules/trae-rule.md`
   - `skills/**/*.md`、`docs/**/*.md`、`.github/**/*.md`
   - `libs/core/src/nest/health/health.constants.ts` 的 metadata 字符串
4. 验证：`npm run build` + `npm test`；不通过则 `git restore` 回滚全部修改并停止
5. 提交改名 commit：`feat: 脱敏公司字眼并准备 GitHub 迁移`
6. 镜像备份仓库：`git clone --mirror . ../backup-thomas-nestjs-packages.git`
7. 生成 `replacements.txt`（filter-repo 格式，每行 `旧值==>新值`），对全历史重写：
   - 文件内容中的公司字眼
   - commit message 中的公司字眼
8. 用户在 GitHub 创建空公开仓库 `<github-user>/nestjs-packages`（无 README、无 .gitignore、无 license）
9. 重设 remote：`git remote set-url origin https://github.com/<github-user>/nestjs-packages.git`
10. 推送：`git push -u origin main --force`；按需推送其余分支与 tag
11. 验证：在 GitHub 仓库搜索确认无 `thomas`/`thomas` 残留（排除 `kqyy` 业务数据）

## 5. 风险与回滚

- **commit hash 全变**：filter-repo 重写后所有 commit hash 变化，旧 clone 失效，需 force push。
- **构建破坏**：工作区改名后先验证 build+test，失败则回滚工作区改动，不进入历史重写。
- **历史丢失**：重写前做 `git clone --mirror` 本地备份，可回滚。
- **filter-repo 需新仓库**：filter-repo 默认要求在 fresh clone 上运行；按其提示处理 `origin` 引用与 `replace`。
- **`<github-user>` 占位**：迁移前用户须填入真实 GitHub 用户名/组织名，否则 scope 与仓库名无效。

## 6. 不做

- 不修改 `kqyy` 等业务数据
- 不修改 `xxx` 类占位示例
- 不删除任何业务代码
- 不改 `xx`（用户确认仅占位）

## 7. 验收标准

- GitHub 仓库可见、Public、包含全部历史（重写后）
- 仓库内全文搜索 `thomas` 无结果；`thomas` 仅剩 `kqyy`（业务数据）一处或按要求保留
- `npm run build` 通过、`npm test` 通过
- npm scope 已改为 `@<github-user>/nestjs`，import 路径一致
