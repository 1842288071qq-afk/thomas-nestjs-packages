#!/usr/bin/env node
// 校验 skills 元数据与 README 索引一致性。
// 用法：node skills/bin/validate-skills.mjs

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = resolve(__dirname, '..');
const README_PATH = join(SKILLS_ROOT, 'README.md');

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
      val = val.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (val === 'true' || val === 'false') {
      val = val === 'true';
    }
    meta[m[1]] = val;
  }
  return { meta, body };
}

async function discoverSkills() {
  const groups = ['atomic', 'composite'];
  const skills = [];
  for (const group of groups) {
    const groupDir = join(SKILLS_ROOT, group);
    if (!existsSync(groupDir)) continue;
    const entries = await readdir(groupDir);
    for (const entry of entries) {
      const path = join(groupDir, entry, 'SKILL.md');
      if (!existsSync(path)) continue;
      const raw = await readFile(path, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      skills.push({ group, dir: entry, path, raw, body, meta });
    }
  }
  return skills;
}

function extractTableSkillNames(readme, sectionTitle) {
  const marker = `### ${sectionTitle}`;
  const idx = readme.indexOf(marker);
  if (idx === -1) return [];
  const nextHeaderIdx = readme.indexOf('\n### ', idx + marker.length);
  const nextMajorIdx = readme.indexOf('\n## ', idx + marker.length);
  let end = readme.length;
  if (nextHeaderIdx !== -1) end = Math.min(end, nextHeaderIdx);
  if (nextMajorIdx !== -1) end = Math.min(end, nextMajorIdx);
  const section = readme.slice(idx, end);
  const names = [];
  const rowRe = /^\|\s*`([^`]+)`/gm;
  let m;
  while ((m = rowRe.exec(section)) !== null) names.push(m[1]);
  return names;
}

function checkRelatedSkillSection(skill) {
  return /##\s*相关 skill/i.test(skill.body);
}

async function main() {
  const skills = await discoverSkills();
  const readme = await readFile(README_PATH, 'utf8');
  const errors = [];
  const warnings = [];

  for (const s of skills) {
    const required = ['name', 'description', 'type', 'tags'];
    for (const key of required) {
      if (!(key in s.meta)) errors.push(`${s.path}: frontmatter 缺少 ${key}`);
    }
    if (s.meta.name && s.meta.name !== s.dir) {
      errors.push(`${s.path}: name(${s.meta.name}) 必须与目录名(${s.dir})一致`);
    }
    if (s.meta.type && s.meta.type !== s.group) {
      errors.push(`${s.path}: type(${s.meta.type}) 必须与分组目录(${s.group})一致`);
    }
    if (s.meta.tags && !Array.isArray(s.meta.tags)) {
      errors.push(`${s.path}: tags 必须是数组形式，如 [a, b]`);
    }
    if (!checkRelatedSkillSection(s)) {
      warnings.push(`${s.path}: 缺少 "## 相关 skill" 段落`);
    }
  }

  const fsAtomic = new Set(skills.filter((s) => s.group === 'atomic').map((s) => s.dir));
  const fsComposite = new Set(skills.filter((s) => s.group === 'composite').map((s) => s.dir));
  const readmeAtomic = new Set(extractTableSkillNames(readme, 'Atomic（元）'));
  const readmeComposite = new Set(extractTableSkillNames(readme, 'Composite（任务级）'));

  for (const name of fsAtomic) {
    if (!readmeAtomic.has(name)) errors.push(`README Atomic 索引缺少: ${name}`);
  }
  for (const name of readmeAtomic) {
    if (!fsAtomic.has(name)) errors.push(`README Atomic 索引有多余项: ${name}`);
  }
  for (const name of fsComposite) {
    if (!readmeComposite.has(name)) errors.push(`README Composite 索引缺少: ${name}`);
  }
  for (const name of readmeComposite) {
    if (!fsComposite.has(name)) errors.push(`README Composite 索引有多余项: ${name}`);
  }

  if (errors.length > 0) {
    console.error(`❌ validate-skills failed (${errors.length} errors)`);
    for (const err of errors) console.error(`- ${err}`);
    if (warnings.length > 0) {
      console.error(`\n⚠ warnings (${warnings.length})`);
      for (const w of warnings) console.error(`- ${w}`);
    }
    process.exit(1);
  }

  console.log(`✅ validate-skills passed (${skills.length} skills checked)`);
  if (warnings.length > 0) {
    console.log(`⚠ warnings (${warnings.length})`);
    for (const w of warnings) console.log(`- ${w}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
