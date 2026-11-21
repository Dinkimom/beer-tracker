/**
 * Храповик формы кода (AGENTS.md, «Форма кода»).
 *
 *   pnpm lint:shape            — новые нарушения и рост старых валят проверку
 *   pnpm lint:shape:baseline   — переснять `.shape-baseline.json` (после упрощения — закоммитить)
 *   pnpm quality:report        — горячие точки: нарушения × правки за 30 дней, кандидаты в REFACTORING_BACKLOG
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  SHAPE_LIMITS,
  compareWithBaseline,
  measureFileShape,
  toBaseline,
  violationKey,
  type ShapeBaseline,
  type ShapeViolation,
} from './shapeMetrics';

const ROOT = path.resolve(__dirname, '../..');

function print(line: string): void {
  process.stdout.write(`${line}\n`);
}
const BASELINE_FILE = path.join(ROOT, '.shape-baseline.json');
const SOURCE_DIRS = ['app', 'components', 'contexts', 'features', 'hooks', 'lib', 'utils'];
const IGNORED = [/\.(test|spec|stories)\.tsx?$/, /\.d\.ts$/, /^lib\/demo\//, /^lib\/i18n\/messages\//];

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function sourceFiles(): string[] {
  return git(['ls-files', ...SOURCE_DIRS])
    .split('\n')
    .filter((file) => /\.tsx?$/.test(file) && !IGNORED.some((pattern) => pattern.test(file)))
    .filter((file) => existsSync(path.join(ROOT, file)));
}

function measureAll(): ShapeViolation[] {
  return sourceFiles().flatMap((file) => measureFileShape(file, readFileSync(path.join(ROOT, file), 'utf8')));
}

function readBaseline(): ShapeBaseline {
  return existsSync(BASELINE_FILE) ? (JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as ShapeBaseline) : {};
}

const UNIT: Record<ShapeViolation['metric'], string> = {
  'hook-lines': `строк (порог ${SHAPE_LIMITS.maxHookLines})`,
  'pass-through': `% проброса пропсов (порог ${SHAPE_LIMITS.maxPassThroughShare * 100}%)`,
  'props-width': `полей (порог ${SHAPE_LIMITS.maxPropsWidth})`,
};

function describe(violation: ShapeViolation): string {
  return `${violationKey(violation)} — ${violation.value} ${UNIT[violation.metric]}`;
}

function check(): number {
  const { added, grown, improved } = compareWithBaseline(measureAll(), readBaseline());
  for (const violation of added) console.error(`новое: ${describe(violation)}`);
  for (const violation of grown) console.error(`выросло: ${describe(violation)}, было ${violation.baseline}`);
  if (improved.length > 0) {
    print(`Стало лучше (${improved.length}) — обновите baseline: pnpm lint:shape:baseline`);
    for (const key of improved) print(`  ${key}`);
  }
  if (added.length + grown.length > 0) {
    console.error(
      '\nФорма кода ухудшилась. Сгруппируйте пропсы в объект-срез, читайте из стора или контекста вместо проброса, ' +
        'режьте хук по зонам ответственности (AGENTS.md, «Форма кода»).'
    );
    return 1;
  }
  print('lint:shape: новых нарушений нет.');
  return 0;
}

function updateBaseline(): number {
  const baseline = toBaseline(measureAll());
  writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
  print(`.shape-baseline.json: ${Object.keys(baseline).length} записей.`);
  return 0;
}

function churnSince(days: number): Map<string, number> {
  const churn = new Map<string, number>();
  const log = git(['log', `--since=${days}.days`, '--name-only', '--format=']);
  for (const file of log.split('\n').filter(Boolean)) churn.set(file, (churn.get(file) ?? 0) + 1);
  return churn;
}

function report(): number {
  const violations = measureAll();
  const churn = churnSince(30);
  const byFile = new Map<string, ShapeViolation[]>();
  for (const violation of violations) byFile.set(violation.file, [...(byFile.get(violation.file) ?? []), violation]);
  const rows = [...byFile.entries()]
    .map(([file, list]) => ({ commits: churn.get(file) ?? 0, file, list }))
    .sort((a, b) => b.commits - a.commits || b.list.length - a.list.length);

  print(`Нарушений: ${violations.length} в ${byFile.size} файлах.\n`);
  print('Горячие точки (правок за 30 дней · нарушения):');
  for (const row of rows.slice(0, 15)) {
    const what = row.list.map((v) => `${v.metric}${v.name ? ` ${v.name}` : ''}=${v.value}`).join(', ');
    print(`  ${String(row.commits).padStart(3)}  ${row.file}  ${what}`);
  }
  return 0;
}

const mode = process.argv[2];
process.exitCode = mode === '--update-baseline' ? updateBaseline() : mode === '--report' ? report() : check();
