#!/usr/bin/env node
// 把 skills/{atomic,composite} 下的 SKILL.md 安装到消费工程的 AI 工具目录。
// 用法：node packages/thomas-nestjs/skills/bin/install-skills.mjs --target=claude-code|copilot|codex|all [--out=path] [--dry-run] [--force] [--list]

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(__dirname, '..');
const PACKAGE_NAMESPACE = 'thomas-nestjs';
const CWD = process.cwd();

const VALID_TARGETS = ['claude-code', 'copilot', 'codex'];

// ---------- arg parsing ----------
function parseArgs(argv) {
  const args = { target: null, out: null, dryRun: false, force: false, list: false };
  for (const raw of argv.slice(2)) {
    const [k, v] = raw.includes('=') ? raw.split('=') : [raw, true];
    switch (k) {
      case '--target': args.target = v; break;
      case '--out': args.out = v; break;
      case '--dry-run': args.dryRun = true; break;
      case '--force': args.force = true; break;
      case '--list': args.list = true; break;
      case '-h': case '--help': args.help = true; break;
      default:
        console.error(`未知参数: ${raw}`);
        process.exit(1);
    }
  }
  return args;
}

const HELP = `\nInstall skills CLI

用法:
  node skills/bin/install-skills.mjs --target=<claude-code|copilot|codex|all> [选项]

选项:
  --target=<name>   目标 AI 工具 (claude-code / copilot / codex / all)
  --out=<path>      自定义输出根目录 (默认按工具约定)
  --list            列出所有 skill 后退出
  --dry-run         仅打印将要写的文件，不实际写入
  --force           覆盖已有同名文件 (默认跳过)
  -h, --help        显示本帮助
`;

// ---------- frontmatter parser (轻量, 仅取 key: value) ----------
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: raw };
  const fmText = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, '');
  const meta = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else if (val === 'true' || val === 'false') {
      val = val === 'true';
    }
    meta[m[1]] = val;
  }
  return { meta, body };
}

// ---------- skill discovery ----------
async function discoverSkills() {
  const groups = ['atomic', 'composite'];
  const skills = [];
  for (const group of groups) {
    const groupDir = join(SKILLS_ROOT, group);
    if (!existsSync(groupDir)) continue;
    const entries = await readdir(groupDir);
    for (const entry of entries) {
      const skillFile = join(groupDir, entry, 'SKILL.md');
      if (!existsSync(skillFile)) continue;
      const raw = await readFile(skillFile, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      skills.push({
        group, dir: entry, name: meta.name || entry,
        description: meta.description || '',
        type: meta.type || group,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        strict: !!meta.strict,
        path: skillFile, raw, body, meta,
      });
    }
  }
  return skills;
}

// ---------- writers ----------
async function writeFileSafe(path, content, { dryRun, force }) {
  if (dryRun) {
    console.log(`[dry-run] write ${relative(CWD, path)} (${content.length} bytes)`);
    return 'dry-run';
  }
  if (existsSync(path) && !force) {
    console.log(`skip   ${relative(CWD, path)} (已存在, 用 --force 覆盖)`);
    return 'skipped';
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  console.log(`write  ${relative(CWD, path)}`);
  return 'written';
}

async function installClaudeCode(skills, opts) {
  // Claude Code 识别路径：<cwd>/.claude/skills/<name>/SKILL.md（扁平一级，不加 group 前缀）
  const outRoot = opts.out
    ? resolve(CWD, opts.out)
    : join(CWD, '.claude', 'skills');
  for (const s of skills) {
    const dest = join(outRoot, s.dir, 'SKILL.md');
    await writeFileSafe(dest, s.raw, opts);
  }
}

async function installCopilot(skills, opts) {
  const outRoot = opts.out
    ? resolve(CWD, opts.out)
    : join(CWD, '.github', 'instructions');
  for (const s of skills) {
    const dest = join(outRoot, `${PACKAGE_NAMESPACE}.${s.group}.${s.dir}.instructions.md`);
    const fm = [
      '---',
      'applyTo: "**"',
      `description: ${JSON.stringify(s.description)}`,
      '---',
      '',
    ].join('\n');
    const content = fm + `<!-- source: ${PACKAGE_NAMESPACE}/${s.group}/${s.dir} -->\n\n` + s.body;
    await writeFileSafe(dest, content, opts);
  }
}

async function installCodex(skills, opts) {
  const outRoot = opts.out
    ? resolve(CWD, opts.out)
    : join(CWD, '.codex', 'skills', PACKAGE_NAMESPACE);
  for (const s of skills) {
    const dest = join(outRoot, s.group, `${s.dir}.md`);
    await writeFileSafe(dest, s.raw, opts);
  }
  // 维护 AGENTS.md 索引段（幂等）
  const agentsPath = join(CWD, 'AGENTS.md');
  const start = `<!-- ${PACKAGE_NAMESPACE}-skills:start -->`;
  const end = `<!-- ${PACKAGE_NAMESPACE}-skills:end -->`;
  const relSkillsRoot = relative(CWD, outRoot);
  const skillSourcePath = `./${relSkillsRoot}`.replace(/\\/g, '/');
  const lines = [start, '', `## thomas NestJS Skills`, '',
    `> 本节由 \`skills/bin/install-skills.mjs\` 维护，请勿手工编辑。`,
    `> Skill 源：[${PACKAGE_NAMESPACE}](${skillSourcePath}/)`, ''];
  const groups = { atomic: '元 Skill (atomic)', composite: '任务级 Skill (composite)' };
  for (const [g, label] of Object.entries(groups)) {
    const list = skills.filter(s => s.group === g);
    if (!list.length) continue;
    lines.push(`### ${label}`, '');
    for (const s of list) {
      const relSkillPath = relative(CWD, join(outRoot, g, `${s.dir}.md`)).replace(/\\/g, '/');
      lines.push(`- **${s.name}** — ${s.description} (\`./${relSkillPath}\`)`);
    }
    lines.push('');
  }
  lines.push(end, '');
  const block = lines.join('\n');

  let existing = '';
  if (existsSync(agentsPath)) existing = await readFile(agentsPath, 'utf8');
  let next;
  if (existing.includes(start) && existing.includes(end)) {
    next = existing.replace(new RegExp(`${escapeRe(start)}[\\s\\S]*?${escapeRe(end)}`), block.trimEnd());
  } else {
    next = (existing.endsWith('\n') || existing === '' ? existing : existing + '\n')
      + (existing ? '\n' : '') + block;
  }
  if (opts.dryRun) {
    console.log(`[dry-run] update AGENTS.md (thomas-nestjs-skills 段)`);
  } else if (next === existing) {
    console.log(`AGENTS.md 已是最新, 跳过`);
  } else {
    await writeFile(agentsPath, next, 'utf8');
    console.log(`update ${relative(CWD, agentsPath)} (thomas-nestjs-skills 段)`);
  }
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(HELP); return; }

  const skills = await discoverSkills();
  if (args.list) {
    console.log(`发现 ${skills.length} 个 skill:`);
    for (const s of skills) {
      const flag = s.strict ? ' ⚠️' : '';
      console.log(`  [${s.group}] ${s.name}${flag} — ${s.description}`);
    }
    return;
  }

  if (!args.target) { console.error('缺少 --target 参数\n' + HELP); process.exit(1); }

  const targets = args.target === 'all' ? VALID_TARGETS : [args.target];
  for (const t of targets) {
    if (!VALID_TARGETS.includes(t)) {
      console.error(`不支持的 target: ${t} (允许: ${VALID_TARGETS.join(', ')}, all)`);
      process.exit(1);
    }
  }

  const opts = { dryRun: args.dryRun, force: args.force, out: args.out };
  for (const t of targets) {
    console.log(`\n=== install target: ${t} ===`);
    if (t === 'claude-code') await installClaudeCode(skills, opts);
    else if (t === 'copilot') await installCopilot(skills, opts);
    else if (t === 'codex') await installCodex(skills, opts);
  }
  console.log('\n完成。');
}

main().catch(e => { console.error(e); process.exit(1); });
