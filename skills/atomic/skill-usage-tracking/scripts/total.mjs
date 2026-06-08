#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`Usage:
  node skills-usage/total.mjs [--root <projectRoot>] [--json]

Options:
  --root <path>  Project root. Defaults to cwd, or the parent of skills-usage/
                 when this script is executed from another directory.
  --json         Print the summary as JSON.
  -h, --help     Show this help.`);
}

function parseArgs(argv) {
  const result = { root: '', json: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '-h' || arg === '--help') {
      result.help = true;
      continue;
    }

    if (arg === '--json') {
      result.json = true;
      continue;
    }

    if (arg === '--root') {
      result.root = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg.startsWith('--root=')) {
      result.root = arg.slice('--root='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

function resolveProjectRoot(rawRoot) {
  if (rawRoot) {
    return path.resolve(rawRoot);
  }

  const cwd = process.cwd();
  if (existsSync(path.join(cwd, 'skills-usage', 'sessions'))) {
    return cwd;
  }

  if (path.basename(__dirname) === 'skills-usage') {
    return path.dirname(__dirname);
  }

  return cwd;
}

function normalizeSkillCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return count;
}

function compareTimestamp(left, right) {
  if (!left) return right || '';
  if (!right) return left;

  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return rightTime > leftTime ? right : left;
  }

  return right > left ? right : left;
}

function sortObjectByCountThenName(input) {
  return Object.fromEntries(
    Object.entries(input).sort(([leftName, leftCount], [rightName, rightCount]) => {
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }
      return leftName.localeCompare(rightName);
    }),
  );
}

async function summarize(projectRoot) {
  const sessionsDir = path.join(projectRoot, 'skills-usage', 'sessions');
  const summary = {
    totalSessions: 0,
    lastUpdated: '',
    skills: {},
    invalidSessions: [],
  };

  if (!existsSync(sessionsDir)) {
    return summary;
  }

  const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();

  for (const file of files) {
    const filePath = path.join(sessionsDir, file);
    let session;

    try {
      session = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      summary.invalidSessions.push({ file, reason: error.message });
      continue;
    }

    if (!session || typeof session !== 'object' || !session.skills || typeof session.skills !== 'object') {
      summary.invalidSessions.push({ file, reason: 'missing skills object' });
      continue;
    }

    summary.totalSessions += 1;
    summary.lastUpdated = compareTimestamp(summary.lastUpdated, session.timestamp || '');

    for (const [skillName, value] of Object.entries(session.skills)) {
      const count = normalizeSkillCount(value);
      if (count === 0) {
        continue;
      }
      summary.skills[skillName] = (summary.skills[skillName] || 0) + count;
    }
  }

  summary.skills = sortObjectByCountThenName(summary.skills);
  return summary;
}

function printTextSummary(projectRoot, summary) {
  console.log('Skill usage summary');
  console.log(`Root: ${projectRoot}`);
  console.log(`Sessions: ${summary.totalSessions}`);
  if (summary.lastUpdated) {
    console.log(`Last updated: ${summary.lastUpdated}`);
  }

  const skills = Object.entries(summary.skills);
  if (skills.length === 0) {
    console.log('No skill usage records found.');
  } else {
    console.log('');
    console.log('Skills:');
    for (const [name, count] of skills) {
      console.log(`  ${String(count).padStart(4, ' ')}  ${name}`);
    }
  }

  if (summary.invalidSessions.length > 0) {
    console.log('');
    console.log('Invalid session files:');
    for (const item of summary.invalidSessions) {
      console.log(`  ${item.file}: ${item.reason}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const projectRoot = resolveProjectRoot(args.root);
  const summary = await summarize(projectRoot);

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printTextSummary(projectRoot, summary);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
