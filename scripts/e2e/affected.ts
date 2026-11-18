/**
 * Какие кейсы docs/TEST_CASES.md задевает текущая работа: коммиты ветки от базы + незакоммиченное.
 *
 *   pnpm e2e:affected               # база — origin/master (или master)
 *   pnpm e2e:affected --base HEAD~3
 *
 * Выводит задетые кейсы (пересмотреть шаги/ожидание, прогнать автотест) и изменённые UI-файлы,
 * которых нет ни в одном кейсе (новое поведение без кейса — завести кейс или дописать путь в «Код»).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { findAffectedCases, parseCaseCatalog } from './caseCatalog';

const print = (text: string) => process.stdout.write(`${text}\n`);

function git(...args: string[]): string[] {
  return execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
}

function resolveBase(): string {
  const index = process.argv.indexOf('--base');
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  for (const candidate of ['origin/master', 'master', 'origin/main', 'main']) {
    try {
      git('rev-parse', '--verify', '--quiet', candidate);
      return candidate;
    } catch {
      // нет такой ветки — следующая
    }
  }
  return 'HEAD';
}

/** Общий предок с базой; у веток без общей истории (публичная ветка) — только незакоммиченное. */
function resolveMergeBase(base: string): string {
  try {
    return git('merge-base', base, 'HEAD')[0] ?? 'HEAD';
  } catch {
    print(`У HEAD нет общего предка с ${base} — смотрю только незакоммиченное (--base <ref> задаёт базу).`);
    return 'HEAD';
  }
}

const base = resolveBase();
const mergeBase = resolveMergeBase(base);
const changed = [
  ...new Set([
    ...git('diff', '--name-only', mergeBase),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]),
].sort();

const { cases } = parseCaseCatalog(readFileSync('docs/TEST_CASES.md', 'utf8'));
const report = findAffectedCases(cases, changed);

print(`База: ${base} (${mergeBase.slice(0, 8)}), изменённых файлов: ${changed.length}\n`);
if (report.affected.length === 0) print('Задетых кейсов нет.');
for (const { files, testCase } of report.affected) {
  const autotest = testCase.autotest ?? `нет — ${testCase.autotestMissingReason ?? 'без причины'}`;
  print(`${testCase.id} [${testCase.contour}] ${testCase.title}\n  автотест: ${autotest}`);
  for (const file of files) print(`  · ${file}`);
}
if (report.uncovered.length > 0) {
  print('\nИзменённые UI-файлы без кейса — новое поведение? Завести кейс или дописать путь в «Код»:');
  for (const file of report.uncovered) print(`  · ${file}`);
}
