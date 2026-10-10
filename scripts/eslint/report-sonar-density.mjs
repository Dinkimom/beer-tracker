#!/usr/bin/env node
/**
 * Reports eslint-plugin-sonarjs issue density per 1000 LoC.
 * Target (AGENTS.md): ≤ 6 / 1000 LoC. Exit 1 if above threshold.
 *
 * Usage: node scripts/eslint/report-sonar-density.mjs
 *        pnpm lint:sonar-density
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const THRESHOLD_PER_1000 = 6;
const ROOT = process.cwd();
const outPath = join(tmpdir(), `beer-tracker-eslint-sonar-${process.pid}.json`);

function countSourceLines(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8');
    return text.split(/\r?\n/).filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith('//') && !t.startsWith('*') && t !== '/*' && t !== '*/';
    }).length;
  } catch {
    return 0;
  }
}

try {
  execFileSync(
    'pnpm',
    ['exec', 'eslint', '.', '-f', 'json', '-o', outPath],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
  );
} catch (err) {
  // ESLint exits non-zero when there are findings; JSON may still be written.
  if (!err || typeof err !== 'object' || !('status' in err)) throw err;
}

if (!existsSync(outPath)) {
  console.error('ESLint did not write a JSON report; aborting.');
  process.exit(2);
}

/** @type {Array<{ filePath: string, messages: Array<{ ruleId: string | null }> }>} */
const results = JSON.parse(readFileSync(outPath, 'utf8'));
unlinkSync(outPath);

const byRule = new Map();
let sonarIssues = 0;
const filesWithSonar = new Set();

for (const file of results) {
  for (const msg of file.messages) {
    if (!msg.ruleId?.startsWith('sonarjs/')) continue;
    sonarIssues += 1;
    filesWithSonar.add(file.filePath);
    byRule.set(msg.ruleId, (byRule.get(msg.ruleId) ?? 0) + 1);
  }
}

let loc = 0;
for (const file of results) {
  if (!/\.(?:[cm]?[jt]sx?|mjs)$/.test(file.filePath)) continue;
  loc += countSourceLines(file.filePath);
}

const density = loc === 0 ? 0 : (sonarIssues / loc) * 1000;
const sortedRules = [...byRule.entries()].sort((a, b) => b[1] - a[1]);

console.log(`SonarJS density: ${density.toFixed(2)} / 1000 LoC (target ≤ ${THRESHOLD_PER_1000})`);
console.log(`Issues: ${sonarIssues}  |  files: ${filesWithSonar.size}  |  LoC (approx): ${loc}`);
if (sortedRules.length > 0) {
  console.log('By rule:');
  for (const [rule, count] of sortedRules) {
    console.log(`  ${count}\t${rule}`);
  }
}

if (density > THRESHOLD_PER_1000) {
  console.error(
    `\nDensity ${density.toFixed(2)} exceeds target ${THRESHOLD_PER_1000} / 1000 LoC.`
  );
  process.exit(1);
}
