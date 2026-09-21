import type { PlannerHotPathDensity } from './plannerHotPathFixtures';
import type { PlannerHotPathWorkloadName } from './plannerHotPathWorkloads';

import process from 'node:process';

import { buildPlannerHotPathSprint } from './plannerHotPathFixtures';
import { PLANNER_HOT_PATH_WORKLOADS } from './plannerHotPathWorkloads';

interface BenchSample {
  cpuMs: number;
  heapChurnBytes: number;
  heapRetainedBytes: number;
  iterations: number;
  resultFingerprint: number;
  wallMs: number;
}

interface BenchRow extends BenchSample {
  density: PlannerHotPathDensity;
  taskCount: number;
  wallPerOpMs: number;
  workload: PlannerHotPathWorkloadName;
}

/** Типичный спринт ~80–100 карточек; 200 — запас на рост. Стресс 800: `--sizes=800`. */
const DEFAULT_SIZES = [100, 200];
const DENSITIES: PlannerHotPathDensity[] = ['sparse', 'dense'];
const FRAME_BUDGET_MS = 16;
const RETAINED_NOISE_BYTES = 32 * 1024;
const WORKLOAD_NAMES: PlannerHotPathWorkloadName[] = [
  'recomputeSwimlaneLayouts',
  'occupancyErrorReasons',
  'overlappingIdsSample',
  'rebuildArrowLinks',
  'dragCellFromMouseBurst',
];

function collectGarbage(): boolean {
  const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  if (typeof gc !== 'function') {
    return false;
  }
  gc();
  gc();
  return true;
}

function iterationsFor(taskCount: number, workload: PlannerHotPathWorkloadName): number {
  if (workload === 'dragCellFromMouseBurst') {
    if (taskCount <= 100) return 60;
    if (taskCount <= 200) return 30;
    return 12;
  }
  if (taskCount <= 100) return 24;
  if (taskCount <= 200) return 12;
  return 4;
}

function measureWorkload(fn: () => number, iterations: number, warmupIterations = 2): BenchSample {
  let fingerprint = 0;
  for (let i = 0; i < warmupIterations; i++) {
    fingerprint = fn();
  }

  collectGarbage();
  const heapBefore = process.memoryUsage().heapUsed;
  const cpuBefore = process.cpuUsage();
  const startedAt = performance.now();
  for (let i = 0; i < iterations; i++) {
    fingerprint = fn();
  }
  const wallMs = performance.now() - startedAt;
  const cpu = process.cpuUsage(cpuBefore);
  const heapAfter = process.memoryUsage().heapUsed;
  collectGarbage();
  const heapAfterGc = process.memoryUsage().heapUsed;

  return {
    cpuMs: (cpu.user + cpu.system) / 1000,
    heapChurnBytes: heapAfter - heapBefore,
    heapRetainedBytes: heapAfterGc - heapBefore,
    iterations,
    resultFingerprint: fingerprint,
    wallMs,
  };
}

function parseSizes(argv: string[]): number[] {
  const flag = argv.find((arg) => arg.startsWith('--sizes='));
  if (!flag) {
    return DEFAULT_SIZES;
  }
  const parsed = flag
    .slice('--sizes='.length)
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((size) => Number.isFinite(size) && size > 0);
  return parsed.length > 0 ? parsed : DEFAULT_SIZES;
}

function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(1)}µs`;
  }
  return `${ms.toFixed(2)}ms`;
}

function formatBytes(bytes: number, hideNoise = false): string {
  if (hideNoise && Math.abs(bytes) < RETAINED_NOISE_BYTES) {
    return '~0';
  }
  const sign = bytes < 0 ? '-' : '';
  const abs = Math.abs(bytes);
  if (abs < 1024) {
    return `${sign}${abs.toFixed(0)}B`;
  }
  if (abs < 1024 * 1024) {
    return `${sign}${(abs / 1024).toFixed(1)}KB`;
  }
  return `${sign}${(abs / (1024 * 1024)).toFixed(2)}MB`;
}

function pad(value: string, width: number): string {
  return value.padEnd(width);
}

function printTable(rows: BenchRow[], gcAvailable: boolean): void {
  const header = [
    pad('size', 6),
    pad('density', 8),
    pad('workload', 26),
    pad('iters', 6),
    pad('wall/op', 10),
    pad('cpu tot', 10),
    pad('heap churn', 12),
    pad('retained', 12),
  ].join(' ');
  const lines = [
    `Planner hot-path bench (gc=${gcAvailable ? 'on' : 'off — rerun with --expose-gc'})`,
    header,
    '-'.repeat(header.length),
    ...rows.map((row) =>
      [
        pad(String(row.taskCount), 6),
        pad(row.density, 8),
        pad(row.workload, 26),
        pad(String(row.iterations), 6),
        pad(formatMs(row.wallPerOpMs), 10),
        pad(formatMs(row.cpuMs), 10),
        pad(formatBytes(row.heapChurnBytes), 12),
        pad(formatBytes(row.heapRetainedBytes, true), 12),
      ].join(' ')
    ),
    '',
    'wall/op — среднее время одного вызова. dragCellFromMouseBurst внутри считает 120 кадров жеста.',
    'heap churn — рост heapUsed за прогон до GC (давление аллокаций). retained — после GC.',
    'CI шумный: сравнивайте относительно предыдущего прогона, не как абсолютный порог.',
    ...overBudgetNotes(rows),
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function overBudgetNotes(rows: BenchRow[]): string[] {
  const slow = rows.filter((row) => row.wallPerOpMs > FRAME_BUDGET_MS);
  if (slow.length === 0) {
    return [`Все вызовы уложились в бюджет кадра ${FRAME_BUDGET_MS}ms (60fps).`];
  }
  return [
    `Выше бюджета кадра ${FRAME_BUDGET_MS}ms (60fps):`,
    ...slow.map(
      (row) =>
        `  ${row.taskCount} ${row.density} ${row.workload} ${formatMs(row.wallPerOpMs)}`
    ),
  ];
}

function runSuite(sizes: number[]): BenchRow[] {
  const rows: BenchRow[] = [];
  for (const taskCount of sizes) {
    for (const density of DENSITIES) {
      const sprint = buildPlannerHotPathSprint({ density, taskCount });
      for (const workload of WORKLOAD_NAMES) {
        const iterations = iterationsFor(taskCount, workload);
        const sample = measureWorkload(
          () => PLANNER_HOT_PATH_WORKLOADS[workload](sprint),
          iterations
        );
        rows.push({
          ...sample,
          density,
          taskCount,
          wallPerOpMs: sample.wallMs / iterations,
          workload,
        });
      }
    }
  }
  return rows;
}

function warmupWorkloads(): void {
  const sprint = buildPlannerHotPathSprint({ density: 'dense', taskCount: 24 });
  for (const workload of WORKLOAD_NAMES) {
    PLANNER_HOT_PATH_WORKLOADS[workload](sprint);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const sizes = parseSizes(argv);
  const gcAvailable = collectGarbage();
  warmupWorkloads();
  const rows = runSuite(sizes);
  if (asJson) {
    process.stdout.write(`${JSON.stringify({ gcAvailable, rows }, null, 2)}\n`);
    return;
  }
  printTable(rows, gcAvailable);
}

main();
