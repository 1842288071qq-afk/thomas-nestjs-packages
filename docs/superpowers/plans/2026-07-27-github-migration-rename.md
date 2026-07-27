# GitHub 迁移与公司字眼脱敏 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `thomas-nestjs-packages` 迁移到 GitHub 公开仓库，并清除工作区与全历史中的 `thomas`/`thomas` 公司字眼，替换为 GitHub 用户名占位 `<GH_USER>`。

**Architecture:** 方案 A —— 先在工作区做文本替换并验证 build+test，再用 `git filter-repo` 对全历史做同样的替换（blob 内容 + commit message）。`public/dict.json` 的业务数据 `kqyy`（口腔医院）必须保护：工作区通过排除该文件保护，filter-repo 通过 `(?<!k)thomas` 正则保护。

**Tech Stack:** Git Bash (sed)、git-filter-repo (pip)、npm/jest、GitHub CLI 可选。

## Global Constraints

- 分支：`claude/feat/github-migration`（已创建并已提交 spec 文档）
- 替换值：环境变量 `GH_USER`，**执行前必须导出**，如 `export GH_USER=your-github-name`。仅允许字母/数字/连字符（GitHub 用户名规则），不得含 `/`、`&`、空格（会破坏 sed）。
- **保护项（绝不修改）**：
  - `public/dict.json` 的 `"value": "kqyy"`（业务数据：口腔医院）
  - 文档占位示例 `xxx-module` / `XXX_USER` / `xxx-permission`（不含 thomas/thomas，规则不会命中）
- 工作区重命名排除：`docs/superpowers/`（迁移文档，保留原貌）、`public/dict.json`、`pnpm-lock.yaml`（无 thomas/thomas，避免无谓改动）
- filter-repo 不删除任何文件；通过 `(?<!k)thomas` 正则保护 `kqyy`
- 测试不通过则回滚工作区改动，不得进入历史重写

---

## 替换规则总表（执行顺序：具体 → 通用）

| # | 旧值 | 新值 |
|---|---|---|
| 1 | `@thomas/nestjs` | `@<GH_USER>/nestjs` |
| 2 | `thomas` | `<GH_USER>` |
| 3 | `thomas` | `<GH_USER>` |
| 4 | `thomas` | `<GH_USER>` |
| 5 | `thomas-nestjs-skills` | `<GH_USER>-nestjs-skills` |
| 6 | `thomas-nestjs-packages` | `<GH_USER>-nestjs-packages` |
| 7 | `thomas-nestjs` | `<GH_USER>-nestjs` |
| 8 | `.tmp-codex-skills/thomas/` | `.tmp-codex-skills/<GH_USER>/` |
| 9 | `nestjs:health-indicator` | `nestjs:health-indicator` |
| 10 | `group-thomas` | `group-<GH_USER>` |
| 11 | `thomas` | `<GH_USER>` |
| 12 | `thomas` | `<GH_USER>` |
| 13 | `(?<!k)thomas`（正则） | `<GH_USER>` |
| 14 | `thomas` | `<GH_USER>` |

顺序关键：#1 先于 #2/#14；#5/#6/#7 先于 #13；#9 先于 #14；#13 用负向回顾排除 `kqyy`。

---

## Task 1: 环境准备 —— 安装 git-filter-repo 并设置 GH_USER

**Files:** 无（环境配置）

**Interfaces:** 无

- [ ] **Step 1: 安装 git-filter-repo**

```bash
pip install git-filter-repo
git filter-repo --version
```
Expected: 打印版本号（如 `2.38.0 (d9b...）`）。

- [ ] **Step 2: 设置 GH_USER（必须由用户填入真实值）**

```bash
export GH_USER=<你的 GitHub 用户名或组织名>
echo "$GH_USER"  # 确认非空
```
Expected: 打印你的 GitHub 用户名。若用户尚未确定，**暂停并询问用户**，不得用空值继续。

- [ ] **Step 3: 预检 —— 确认 kqyy 仅出现在 dict.json 与迁移文档**

```bash
git grep -I -n "kqyy" -- . ':!public/dict.json' ':!docs/superpowers/'
```
Expected: 无输出（exit code 1）。若有一行输出，说明 `kqyy` 还出现在别处，**停止**并人工核查该处是否业务数据。

- [ ] **Step 4: 预检 —— 统计待改文件数**

```bash
git grep -i -l -I -e 'thomas' -e 'thomas' -- . ':!docs/superpowers/' ':!public/dict.json' ':!pnpm-lock.yaml' | wc -l
```
Expected: 一个数字（预计 40-60）。记录该数字供 Task 4 对比。

- [ ] **Step 5: 不提交（无文件变更）**

---

## Task 2: 工作区文本替换

**Files:**
- Modify: `package.json`（name/description/author）
- Modify: `tsconfig.json`（paths）
- Modify: 所有 `libs/**/*.ts`、`apps/**/*.ts` 中 `@thomas/nestjs` import
- Modify: `README.md`、`AGENTS.md`、`.trae/rules/trae-rule.md`、`skills/**/*.md`、`docs/**/*.md`、`.github/**/*.md`
- Modify: `libs/core/src/nest/health/health.constants.ts`（metadata 字符串）
- 不动: `docs/superpowers/`、`public/dict.json`、`pnpm-lock.yaml`

**Interfaces:** 无

- [ ] **Step 1: 列出待改文件到数组**

```bash
mapfile -t FILES < <(git grep -i -l -I -e 'thomas' -e 'thomas' -- . ':!docs/superpowers/' ':!public/dict.json' ':!pnpm-lock.yaml')
printf '%s\n' "${FILES[@]}" | head
```
Expected: 打印若干文件路径，含 `package.json`、`tsconfig.json`、`README.md`、`AGENTS.md`、`apps/playground/src/playground.module.ts` 等。

- [ ] **Step 2: 执行 sed 替换（按规则总表顺序，排除 dict.json 所以 #13 用裸 thomas 安全）**

```bash
for f in "${FILES[@]}"; do
  sed -i \
    -e "s/@thomas\/nestjs/@${GH_USER}\/nestjs/g" \
    -e "s/thomas/${GH_USER}/g" \
    -e "s/thomas/${GH_USER}/g" \
    -e "s/thomas/${GH_USER}/g" \
    -e "s/thomas-nestjs-skills/${GH_USER}-nestjs-skills/g" \
    -e "s/thomas-nestjs-packages/${GH_USER}-nestjs-packages/g" \
    -e "s/thomas-nestjs/${GH_USER}-nestjs/g" \
    -e "s|\.tmp-codex-skills/thomas/|.tmp-codex-skills/${GH_USER}/|g" \
    -e "s/nestjs:health-indicator/nestjs:health-indicator/g" \
    -e "s/group-thomas/group-${GH_USER}/g" \
    -e "s/thomas/${GH_USER}/g" \
    -e "s/thomas/${GH_USER}/g" \
    -e "s/thomas/${GH_USER}/g" \
    -e "s/thomas/${GH_USER}/g" \
    "$f"
done
echo "done"
```
Expected: `done`。注意：因为 `FILES` 已排除 `public/dict.json`，最后两条裸 `thomas`/`thomas` 规则不会命中 `kqyy`。

- [ ] **Step 3: 确认 package.json name 已改**

```bash
grep -E '"name"|"description"' package.json | head
```
Expected: `"name": "@<GH_USER>/nestjs"`，description 不含 thomas/thomas。

- [ ] **Step 4: 确认 tsconfig paths 已改**

```bash
grep -n "thomas\|thomas\|${GH_USER}" tsconfig.json | head
```
Expected: 仅出现 `@<GH_USER>/nestjs/...`，无 thomas/thomas。

- [ ] **Step 5: 不提交（等 Task 4 验证后一起提交）**

---

## Task 3: 验证 build + test

**Files:** 无（运行验证）

**Interfaces:** 无

- [ ] **Step 1: 安装依赖（如 node_modules 不在则跳过）**

```bash
[ -d node_modules ] || npm install
```
Expected: node_modules 就绪。

- [ ] **Step 2: 构建**

```bash
npm run build
```
Expected: 编译通过，无 TS 报错。若失败，检查 import 路径是否全部改为 `@<GH_USER>/nestjs/...`。

- [ ] **Step 3: 跑测试**

```bash
npm test
```
Expected: 全部通过。若失败，**回滚**：`git restore .` 并停止，向用户报告失败原因。

- [ ] **Step 4: 若通过则继续，不提交**

---

## Task 4: 残留校验与提交

**Files:** 无（校验 + git）

**Interfaces:** 无

- [ ] **Step 1: 校验工作区无 thomas/thomas 残留（排除迁移文档与 dict.json）**

```bash
git grep -I -n -i -e 'thomas' -e 'thomas' -- . ':!docs/superpowers/' ':!public/dict.json'
```
Expected: **无输出**（exit 1）。若有输出，逐条核查并补 sed 规则或人工修正。

- [ ] **Step 2: 校验 dict.json 的 kqyy 完好**

```bash
grep -n "kqyy" public/dict.json
```
Expected: `"value": "kqyy",` 仍在，未被改动。

- [ ] **Step 3: 校验占位示例未被误伤**

```bash
git grep -I -n -e 'xxx-module' -e 'XXX_USER' -e 'xxx-permission'
```
Expected: 仍有输出（占位示例保留）。若被改坏，回滚并改用更精确规则。

- [ ] **Step 4: 暂存并提交**

```bash
git add -A
git status --short | head -50
git commit -m "feat: 脱敏 thomas/thomas 公司字眼并准备 GitHub 迁移"
```
Expected: 提交成功，列出大量修改文件。

- [ ] **Step 5: 再次 build+test 复验（提交后）**

```bash
npm run build && npm test
```
Expected: 通过。

---

## Task 5: 镜像备份仓库

**Files:** 无（备份）

**Interfaces:** 无

- [ ] **Step 1: 在父目录做 mirror 克隆作为回滚备份**

```bash
cd "e:/project/backend"
git clone --mirror thomas-nestjs-packages ../backup-thomas-nestjs-packages.git
ls -d ../backup-thomas-nestjs-packages.git
```
Expected: 备份目录存在（含 `config`、`HEAD`、`objects` 等）。重写历史出错时可从此备份恢复。

- [ ] **Step 2: 回到工作目录**

```bash
cd "e:/project/backend/thomas-nestjs-packages"
```

---

## Task 6: 用 git filter-repo 重写全历史

**Files:** 无（历史重写，作用于所有历史 blob 与 commit message）

**Interfaces:** 无

- [ ] **Step 1: 生成 replacements.txt（filter-repo 格式：literal 行用 `==>`, 正则行用 `regex:` 前缀）**

```bash
cat > /tmp/replacements.txt <<EOF
@thomas/nestjs==>@${GH_USER}/nestjs
thomas==>${GH_USER}
thomas==>${GH_USER}
thomas==>${GH_USER}
thomas-nestjs-skills==>${GH_USER}-nestjs-skills
thomas-nestjs-packages==>${GH_USER}-nestjs-packages
thomas-nestjs==>${GH_USER}-nestjs
.tmp-codex-skills/thomas/==>.tmp-codex-skills/${GH_USER}/
nestjs:health-indicator==>nestjs:health-indicator
group-thomas==>group-${GH_USER}
thomas==>${GH_USER}
thomas==>${GH_USER}
regex:(?<!k)thomas==>${GH_USER}
thomas==>${GH_USER}
EOF
cat /tmp/replacements.txt
```
Expected: 打印 14 行规则。注意 `regex:(?<!k)thomas` 用负向回顾保护 `kqyy`。

- [ ] **Step 2: 生成 message-callback 脚本（处理 commit message 中的公司字眼）**

```bash
cat > /tmp/scrub_messages.py <<'PYEOF'
new = message
new = new.replace(b"@thomas/nestjs", b"@__USER__/nestjs")
new = new.replace(b"thomas", b"__USER__")
new = new.replace(b"thomas", b"__USER__")
new = new.replace(b"thomas", b"__USER__")
new = new.replace(b"thomas-nestjs-skills", b"__USER__-nestjs-skills")
new = new.replace(b"thomas-nestjs-packages", b"__USER__-nestjs-packages")
new = new.replace(b"thomas-nestjs", b"__USER__-nestjs")
new = new.replace(b".tmp-codex-skills/thomas/", b".tmp-codex-skills/__USER__/")
new = new.replace(b"nestjs:health-indicator", b"nestjs:health-indicator")
new = new.replace(b"group-thomas", b"group-__USER__")
new = new.replace(b"thomas", b"__USER__")
new = new.replace(b"thomas", b"__USER__")
new = new.replace(b"kqyy", b"\x00KQYY\x00")  # 临时保护
new = new.replace(b"thomas", b"__USER__")
new = new.replace(b"\x00KQYY\x00", b"kqyy")
new = new.replace(b"thomas", b"__USER__")
return new
PYEOF
sed -i "s/__USER__/${GH_USER}/g" /tmp/scrub_messages.py
cat /tmp/scrub_messages.py
```
Expected: 打印脚本，其中 `__USER__` 已全部替换为实际 `GH_USER` 值。`kqyy` 用占位符临时保护再还原（commit message 中理论上无 kqyy，但保险起见）。

- [ ] **Step 3: 执行 filter-repo（同时处理 blob 内容与 commit message）**

```bash
git filter-repo --force \
  --replace-text /tmp/replacements.txt \
  --message-callback "$(cat /tmp/scrub_messages.py)"
```
Expected: filter-repo 输出 `Parsed X commits` 等并完成；可能提示 `origin` 已被移除（正常）。若报错 `already a fresh clone` 等，按提示加 `--force`（已加）。

- [ ] **Step 4: 确认历史中无 thomas/thomas 残留（blob 内容，排除迁移文档与 dict.json）**

```bash
git grep -I -n -i -e 'thomas' -e 'thomas' $(git rev-list --all) -- . ':!docs/superpowers/' ':!public/dict.json' 2>/dev/null | head
```
Expected: 无输出。若输出历史 blob 残留，记录文件路径与 commit，补规则后重跑 Task 6（需从备份 clone 重新开始）。

- [ ] **Step 5: 确认历史 commit message 无 thomas/thomas**

```bash
git log --all --format="%H %s" | grep -iE "thomas|thomas" | head
```
Expected: 无输出。

- [ ] **Step 6: 确认 dict.json 历史中 kqyy 完好**

```bash
git log --oneline -- public/dict.json | head
git show HEAD:public/dict.json | grep -n "kqyy"
```
Expected: `"value": "kqyy",` 仍在。

- [ ] **Step 7: 重新 build+test（重写后工作区已是新 HEAD）**

```bash
npm run build && npm test
```
Expected: 通过。注意：filter-repo 重写后 `node_modules` 可能需重建，先 `npm run build`。

---

## Task 7: 用户在 GitHub 创建空公开仓库（人工操作）

**Files:** 无

**Interfaces:** 无

- [ ] **Step 1: 暂停并请用户在 GitHub 创建空仓库**

向用户说明：
- 仓库名：`<GH_USER>-nestjs-packages`
- 可见性：**Public**
- **不要**勾选 Initialize with README / .gitignore / license（保持空仓库）
- 创建后把 HTTPS URL 回填给 Agent

- [ ] **Step 2: 等待用户确认仓库已创建并给出 URL**

不得擅自用 `gh repo create`（除非用户授权）。用户确认后再继续。

---

## Task 8: 重设 remote 并 force push

**Files:** 无（git remote）

**Interfaces:** 无

- [ ] **Step 1: 重设 origin 到 GitHub**

```bash
git remote remove origin 2>/dev/null
git remote add origin https://github.com/${GH_USER}/${GH_USER}-nestjs-packages.git
git remote -v
```
Expected: origin 指向 `github.com/<GH_USER>/<GH_USER>-nestjs-packages.git`。

- [ ] **Step 2: 推送 main（force，因历史已重写）**

```bash
git push -u origin main --force
```
Expected: 推送成功。可能需 Git 凭据（HTTPS token 或 credential helper）。

- [ ] **Step 3: 推送其余分支与 tag（可选，按需）**

```bash
git branch -a | grep -v HEAD
git push origin --all --force
git push origin --tags --force
```
Expected: 全部分支/tag 推送。注意只推送业务分支，跳过 `legacy`/`detached` 等历史分支（按用户意愿）。

---

## Task 9: GitHub 侧最终校验

**Files:** 无

**Interfaces:** 无

- [ ] **Step 1: 克隆到临时目录验证（模拟外部视角）**

```bash
cd /tmp
git clone https://github.com/${GH_USER}/${GH_USER}-nestjs-packages.git verify-clone
cd verify-clone
git log --oneline | head
```
Expected: 克隆成功，历史为重写后的版本。

- [ ] **Step 2: 全仓库搜索 thomas/thomas 残留**

```bash
grep -rIi -e 'thomas' -e 'thomas' . | grep -v '\.git/'
```
Expected: 仅 `public/dict.json` 的 `kqyy`（业务数据）与 `docs/superpowers/` 迁移文档中的提及（如保留）。其余无残留。若有意外残留，回退到 Task 6 修复。

- [ ] **Step 3: 验证 build+test 在干净克隆中通过**

```bash
npm install
npm run build && npm test
```
Expected: 通过。

- [ ] **Step 4: 清理临时目录**

```bash
cd "e:/project/backend/thomas-nestjs-packages"
rm -rf /tmp/verify-clone
```

- [ ] **Step 5: 向用户报告迁移完成**

报告内容：GitHub 仓库 URL、提交数、保护项状态（kqyy 完好）、build/test 状态。建议用户更新本地其他 clone（因历史 hash 已变）。

---

## Self-Review 记录

- **Spec 覆盖**：spec 第 4 节 11 步均映射到 Task 1-9；第 5 节风险（hash 变化、构建破坏、备份）由 Task 3 回滚 + Task 5 备份覆盖；第 2.2 保护项由 Task 1 预检 + Task 4/6 校验覆盖。
- **占位扫描**：无 TBD/TODO；`<GH_USER>` 为运行时变量（用户填入），非计划占位；每步含具体命令与期望输出。
- **类型一致**：规则总表 14 条在 Task 2（sed）与 Task 6（filter-repo）中顺序一致；`(?<!k)thomas` 正则与 dict.json 排除双重保护 `kqyy`。
- **风险点**：filter-repo `--replace-text` 规则顺序按文件列出顺序应用（filter-repo 文档），具体规则在前、通用规则在后；Task 6 Step 4 校验历史残留可捕获任何顺序问题。
