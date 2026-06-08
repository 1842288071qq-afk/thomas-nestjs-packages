---
name: skill-usage-tracking
description: 记录本次会话中使用的 skill 及触发次数，只写入 skills-usage/sessions/ 会话文件，并用随 skill 提供的 total.mjs 实时汇总查看。
type: atomic
tags: [meta, tracking, statistics]
when_to_use: 关键词 — skill统计, skill使用, 记录skill, 保存skill, skill-usage, tracking
---

# Skill 使用统计

## 触发条件

以下任一情况触发本 skill：

- 用户明确要求记录/保存/查看本次会话的 skill 使用情况（如"记录这次用到的 skill"、"保存 skill 统计"、"统计本次 skill 使用"）
- CLAUDE.md 全局规则在主要编码任务完成后自动要求执行

**如果用户在本次会话开始时说明"忽略 skill 统计"，则跳过本 skill 的所有操作。**

## 操作流程

### 第一步：识别本次会话使用的 skill

回顾本次对话，找出所有被明确触发或参考过的 skill 名称（即 `.claude/skills/` 下的子目录名，如 `implement-service`、`dto-validation`）。  
每个 skill 记录触发次数（同一 skill 在对话中被多次引用/使用，每次计 1 次）。

如果本次会话未使用任何 skill，打印提示后跳过后续写入操作。

### 第二步：生成会话描述

用一句简短的中文描述本次会话完成的主要任务（15 字以内），例如：  
`"实现用户认证 Service 和 Controller"` 、`"修复分页查询 Bug"`。

### 第三步：确定文件路径

```
{projectRoot}/skills-usage/
  total.mjs
  sessions/
    .gitkeep
    {timestamp}_{slug}.json
```

- `{timestamp}` 文件名格式：`YYYY-MM-DDTHH-mm-ss-SSS`（用当前时间，含毫秒，降低多人并发时的文件名碰撞概率）
- `{slug}` 为会话描述的 kebab-case 拼音缩写（2~4 个单词），例如 `implement-auth-service`
- 若目标 session 文件名已存在，在文件名末尾追加 `-2`、`-3` 等序号，禁止覆盖已有 session 文件

### 第四步：写入会话 JSON

在 `skills-usage/sessions/` 下创建文件，格式：

```json
{
  "timestamp": "2026-04-30T10:30:00Z",
  "description": "实现用户认证 Service 和 Controller",
  "skills": {
    "implement-service": 2,
    "implement-controller": 1,
    "dto-validation": 3
  }
}
```

### 第五步：查看实时汇总

需要查看 total 时，运行项目内脚本：

```bash
node skills-usage/total.mjs
```

需要机器可读输出时：

```bash
node skills-usage/total.mjs --json
```

该脚本实时读取 `skills-usage/sessions/*.json` 后汇总输出，不写入任何统计文件。

## 初始化与脚本安装

`pnpm init:monorepo` 应幂等创建：

```
skills-usage/
  total.mjs
  sessions/
    .gitkeep
```

`total.mjs` 的权威源随本 skill 提供：

```
{serverDir}/packages/@thomas/nestjs/skills/atomic/skill-usage-tracking/scripts/total.mjs
```

若项目中缺失该脚本，可从子模块复制：

```bash
mkdir -p skills-usage/sessions
cp {serverDir}/packages/@thomas/nestjs/skills/atomic/skill-usage-tracking/scripts/total.mjs skills-usage/total.mjs
```

## 废弃项

- 禁止创建、更新或依赖 `skills-usage/total.json`
- 若历史项目仍有 `skills-usage/total.json`，本 skill 不再修改它；确认 session 数据完整后再由项目维护者删除

## 注意事项

- `skills-usage/` 目录**不应加入 .gitignore**，团队共享统计有助于演进 skill 体系
- skill 名称使用目录名，不含路径和扩展名
- 写文件时使用 Write 工具；读文件时使用 Read 工具；若文件不存在则从零初始化
- 写入前先打印"正在记录本次 skill 使用统计…"让用户知晓

## 相关 skill

无
