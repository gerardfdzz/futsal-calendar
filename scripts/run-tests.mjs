#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(scriptDir, '..', 'tests');

function findTestFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.test.ts'))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
    .sort();
}

const testFiles = findTestFiles(testsDir);

if (testFiles.length === 0) {
  console.error(`No *.test.ts files found under ${testsDir}`);
  process.exit(1);
}

const watch = process.argv.includes('--watch');
const args = ['--import', 'tsx', '--test', ...(watch ? ['--watch'] : []), ...testFiles];

console.log(`Running ${testFiles.length} test file(s)...\n`);

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
