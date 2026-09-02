#!/usr/bin/env node
/**
 * Cross-platform test runner: finds every `*.test.ts` under `tests/` and
 * runs them with Node's built-in test runner, loading TypeScript via tsx.
 *
 * Two portability problems this works around:
 *
 * 1. An earlier version used `find`/`sort`/`$(...)` in the `npm test`
 *    script itself. That's POSIX shell syntax — it doesn't exist in
 *    PowerShell/cmd.exe. Discovering files here in plain Node
 *    (`fs.readdirSync(..., { recursive: true })`, stable since Node 20)
 *    works identically on every OS.
 *
 * 2. Spawning the `tsx` CLI binary (`spawnSync('tsx', ...)`) needs
 *    `shell: true` to resolve the `.cmd` shim npm creates on Windows, and
 *    that shell hop re-parses the whole command line — which breaks when
 *    any path (project folder, file path) contains spaces or characters
 *    like " - " (e.g. a `OneDrive - <Company>` folder), because
 *    quoting/escaping through cmd.exe is notoriously fragile. Spawning
 *    `process.execPath` (node itself) directly with
 *    `--import tsx --test <files>` avoids the shell entirely — `tsx` is
 *    loaded as a module (Node's documented way to run TypeScript via tsx,
 *    see https://tsx.is), and the files are passed as a real argv array,
 *    so spaces/dashes in paths are never re-parsed by anything.
 */
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

// No `shell: true` on purpose — see the comment above.
const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
