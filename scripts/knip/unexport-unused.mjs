#!/usr/bin/env node
/**
 * Снимает export с символов, которые Knip считает unused (кроме index.ts).
 * Запуск: node scripts/knip/unexport-unused.mjs [--dry-run]
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const dryRun = process.argv.includes('--dry-run');
const skipFiles = new Set([
  'scripts/knip/unexport-unused.mjs',
  'scripts/knip/prune-index-exports.mjs',
]);

const knipJson = execSync('npx knip --reporter json 2>/dev/null || true', {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 100 * 1024 * 1024,
});

/** @type {{ issues: Array<{ file: string, exports?: Array<{ name: string }>, types?: Array<{ name: string }> }> }} */
const report = JSON.parse(knipJson);

/** @param {string} src @param {string} name */
function unexportSymbol(src, name) {
  let next = src;
  const patterns = [
    [`export async function ${name}`, `async function ${name}`],
    [`export function ${name}`, `function ${name}`],
    [`export const ${name}`, `const ${name}`],
    [`export type ${name}`, `type ${name}`],
    [`export interface ${name}`, `interface ${name}`],
    [`export enum ${name}`, `enum ${name}`],
    [`export class ${name}`, `class ${name}`],
  ];
  for (const [from, to] of patterns) {
    if (next.includes(from)) {
      next = next.replace(from, to);
    }
  }
  return next;
}

let changedFiles = 0;
for (const issue of report.issues) {
  const rel = issue.file;
  if (skipFiles.has(rel)) continue;
  if (rel.endsWith('/index.ts') || rel.endsWith('\\index.ts')) continue;

  const names = [
    ...(issue.exports ?? []).map((e) => e.name),
    ...(issue.types ?? []).map((e) => e.name),
  ];
  if (names.length === 0) continue;

  const abs = path.join(ROOT, rel);
  let src;
  try {
    src = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }

  let next = src;
  for (const name of names) {
    next = unexportSymbol(next, name);
  }
  if (next === src) continue;

  changedFiles += 1;
  if (dryRun) {
    console.log(`would unexport ${rel} (${names.length} symbols)`);
  } else {
    writeFileSync(abs, next);
    console.log(`unexported ${rel} (${names.length} symbols)`);
  }
}

console.log(dryRun ? `dry-run: ${changedFiles} files` : `updated ${changedFiles} files`);
