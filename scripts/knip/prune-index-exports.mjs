#!/usr/bin/env node
/**
 * Удаляет из index.ts реэкспорты, которые Knip считает unused exports.
 * Запуск: node scripts/knip/prune-index-exports.mjs [--dry-run]
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const dryRun = process.argv.includes('--dry-run');

const knipJson = execSync('npx knip --reporter json 2>/dev/null || true', {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 100 * 1024 * 1024,
});

/** @type {{ issues: Array<{ file: string, exports?: Array<{ name: string }>, types?: Array<{ name: string }> }> }} */
const report = JSON.parse(knipJson);

/** @type {Map<string, Set<string>>} */
const unusedByFile = new Map();
for (const issue of report.issues) {
  const names = [
    ...(issue.exports ?? []).map((e) => e.name),
    ...(issue.types ?? []).map((e) => e.name),
  ];
  if (names.length === 0) continue;
  const rel = issue.file;
  if (!unusedByFile.has(rel)) unusedByFile.set(rel, new Set());
  for (const name of names) unusedByFile.get(rel).add(name);
}

/** @param {string} src @param {Set<string>} unused */
function pruneSource(src, unused) {
  let next = src;
  for (const name of unused) {
    next = next.replace(new RegExp(`^\\s*type\\s+${name}\\s*,\\s*$`, 'gm'), '');
    next = next.replace(new RegExp(`^\\s*${name}\\s*,\\s*$`, 'gm'), '');
    next = next.replace(new RegExp(`^\\s*type\\s+${name}\\s*$`, 'gm'), '');
    next = next.replace(new RegExp(`^\\s*${name}\\s*$`, 'gm'), '');
    next = next.replace(new RegExp(`,\\s*type\\s+${name}\\b`, 'g'), '');
    next = next.replace(new RegExp(`,\\s*${name}\\b`, 'g'), '');
    next = next.replace(new RegExp(`\\btype\\s+${name}\\s*,`, 'g'), '');
    next = next.replace(new RegExp(`\\b${name}\\s*,`, 'g'), '');
  }

  next = next.replace(/export\s+\{\s*,/g, 'export {');
  next = next.replace(/,\s*\}/g, '\n}');
  next = next.replace(/export\s+type\s+\{\s*,/g, 'export type {');
  next = next.replace(/export\s+\{\s*\}\s+from\s+[^;]+;\s*\n/g, '');
  next = next.replace(/export\s+type\s+\{\s*\}\s+from\s+[^;]+;\s*\n/g, '');
  next = next.replace(/\n{3,}/g, '\n\n');
  return next;
}

let changedFiles = 0;
for (const [rel, unused] of unusedByFile) {
  if (!rel.endsWith('/index.ts') && !rel.endsWith('\\index.ts')) continue;
  const abs = path.join(ROOT, rel);
  let src;
  try {
    src = readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  const pruned = pruneSource(src, unused);
  if (pruned === src) continue;
  changedFiles += 1;
  if (dryRun) {
    console.log(`would prune ${rel} (${unused.size} symbols)`);
  } else {
    writeFileSync(abs, pruned);
    console.log(`pruned ${rel} (${unused.size} symbols)`);
  }
}

console.log(dryRun ? `dry-run: ${changedFiles} index files` : `updated ${changedFiles} index files`);
