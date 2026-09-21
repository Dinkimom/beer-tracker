import type { Task } from '@/types';

import { DEFAULT_SLA_BUG_THRESHOLDS, type SlaBugThresholds } from './config';
import { countSlaBugTasksByPriority } from './sidebarStats';

export type SlaBugQualityZone = 'green' | 'red' | 'yellow';

export type SlaBugNeedToClosePriority = 'P0' | 'P1' | 'P2';

export const SLA_BUG_NEED_TO_CLOSE_PRIORITIES = ['P0', 'P1', 'P2'] as const satisfies readonly SlaBugNeedToClosePriority[];

export type SlaBugNeedToCloseCounts = Record<SlaBugNeedToClosePriority, number>;

interface SlaBugQualityZoneSnapshot {
  needToClose: SlaBugNeedToCloseCounts;
  zone: SlaBugQualityZone;
}

export function computeNeedToCloseCounts(tasks: Task[]): SlaBugNeedToCloseCounts {
  const byPriority = countSlaBugTasksByPriority(tasks);
  return {
    P0: byPriority.P0,
    P1: byPriority.P1,
    P2: byPriority.P2,
  };
}

/**
 * Зона качества по ZBP:
 * - красная: есть P0 или активных P1 ≥ zbpQualityZoneRedP1Min (по умолчанию 2);
 * - жёлтая: P0 нет, активных P1 ≥ zbpQualityZoneYellowP1Min (по умолчанию 1);
 * - зелёная: P0 нет и P1 ниже жёлтого порога.
 *
 * P2 на цвет зоны не влияет (в политике пока не зафиксирован; см. FAQ ZBP).
 */
export function computeSlaBugQualityZone(
  counts: SlaBugNeedToCloseCounts,
  thresholds: Pick<SlaBugThresholds, 'zbpQualityZoneRedP1Min' | 'zbpQualityZoneYellowP1Min'> = DEFAULT_SLA_BUG_THRESHOLDS
): SlaBugQualityZone {
  if (counts.P0 > 0 || counts.P1 >= thresholds.zbpQualityZoneRedP1Min) {
    return 'red';
  }
  if (counts.P1 >= thresholds.zbpQualityZoneYellowP1Min) {
    return 'yellow';
  }
  return 'green';
}

/** Следующая зона по качеству (лучше текущей); для зелёной — null. */
export function getNextSlaBugQualityZone(zone: SlaBugQualityZone): SlaBugQualityZone | null {
  switch (zone) {
    case 'red':
      return 'yellow';
    case 'yellow':
      return 'green';
    case 'green':
      return null;
  }
}

const TARGET_ZONE_MAX_OPEN: Record<Exclude<SlaBugQualityZone, 'red'>, SlaBugNeedToCloseCounts> = {
  // Условие пользователя: для жёлтой зоны допускаем максимум P0=0, P1=1, P2=2.
  yellow: { P0: 0, P1: 1, P2: 2 },
  // Для зелёной считаем целевым ноль по P0–P2.
  green: { P0: 0, P1: 0, P2: 0 },
};

/** Сколько задач по каждому приоритету нужно закрыть, чтобы войти в целевую зону. */
export function computeNeedToCloseForZone(
  counts: SlaBugNeedToCloseCounts,
  targetZone: Exclude<SlaBugQualityZone, 'red'>
): SlaBugNeedToCloseCounts {
  const limits = TARGET_ZONE_MAX_OPEN[targetZone];
  return {
    P0: Math.max(0, counts.P0 - limits.P0),
    P1: Math.max(0, counts.P1 - limits.P1),
    P2: Math.max(0, counts.P2 - limits.P2),
  };
}

export function buildSlaBugQualityZoneSnapshot(tasks: Task[]): SlaBugQualityZoneSnapshot {
  const needToClose = computeNeedToCloseCounts(tasks);
  return {
    needToClose,
    zone: computeSlaBugQualityZone(needToClose),
  };
}
