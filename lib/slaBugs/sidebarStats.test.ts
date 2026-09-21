import type { SlaBugsBySection } from './types';
import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  buildSlaBugSidebarStats,
  computeSlaRiskCount,
  countSlaBugTasksByPriority,
  emptySlaBugPriorityCounts,
  filterTasksCreatedSince,
  filterTasksResolvedSince,
  groupSlaBugTasksByPriority,
} from './sidebarStats';

function bug(id: string, incidentSeverity?: string, dates?: { createdAt?: string; resolvedAt?: string }): Task {
  return {
    id,
    name: id,
    link: `https://tracker.yandex.ru/${id}`,
    team: 'Back',
    type: 'bug',
    incidentSeverity,
    createdAt: dates?.createdAt,
    resolvedAt: dates?.resolvedAt,
  };
}

function emptyGrouped(): SlaBugsBySection {
  return { take_now: [], watch: [], regular: [], review: [] };
}

describe('sidebarStats', () => {
  it('emptySlaBugPriorityCounts returns zeros', () => {
    expect(emptySlaBugPriorityCounts()).toEqual({
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
    });
  });

  it('countSlaBugTasksByPriority groups by incident severity', () => {
    const counts = countSlaBugTasksByPriority([
      bug('B-1', 'P1'),
      bug('B-2', 'p3'),
      bug('B-3', 'P1'),
      bug('B-4', 'unknown'),
    ]);

    expect(counts).toEqual({
      P0: 0,
      P1: 2,
      P2: 0,
      P3: 1,
      P4: 0,
    });
  });

  it('computeSlaRiskCount equals take_now length', () => {
    const grouped: SlaBugsBySection = {
      ...emptyGrouped(),
      take_now: [{ task: bug('B-1') }, { task: bug('B-2') }] as SlaBugsBySection['take_now'],
    };

    expect(computeSlaRiskCount(grouped)).toBe(2);
  });

  it('groupSlaBugTasksByPriority groups task refs and sorts by id', () => {
    const grouped = groupSlaBugTasksByPriority([
      bug('SUP-2', 'P1'),
      bug('SUP-10', 'P1'),
      bug('SUP-1', 'P3'),
    ]);

    expect(grouped.P1.map((task) => task.id)).toEqual(['SUP-2', 'SUP-10']);
    expect(grouped.P3.map((task) => task.id)).toEqual(['SUP-1']);
    expect(grouped.P0).toEqual([]);
  });

  it('filterTasksResolvedSince keeps only bugs resolved on or after since', () => {
    const since = new Date('2026-06-12T00:00:00.000Z');
    const filtered = filterTasksResolvedSince(
      [
        bug('OLD', 'P0', { resolvedAt: '2026-05-01T12:00:00.000Z' }),
        bug('RECENT', 'P1', { resolvedAt: '2026-06-15T10:00:00.000Z' }),
        bug('NO_DATE', 'P2'),
      ],
      since
    );

    expect(filtered.map((task) => task.id)).toEqual(['RECENT']);
  });

  it('filterTasksCreatedSince keeps only bugs created on or after since', () => {
    const since = new Date('2026-06-12T00:00:00.000Z');
    const filtered = filterTasksCreatedSince(
      [
        bug('OLD', 'P3', { createdAt: '2026-01-01T00:00:00.000Z' }),
        bug('NEW', 'P4', { createdAt: '2026-06-13T08:00:00.000Z' }),
      ],
      since
    );

    expect(filtered.map((task) => task.id)).toEqual(['NEW']);
  });

  it('buildSlaBugSidebarStats aggregates weekly buckets and SLA risk', () => {
    const arrived = [bug('A-1', 'P3'), bug('A-2', 'P1')];
    const closed = [bug('C-1', 'P4')];
    const grouped: SlaBugsBySection = {
      ...emptyGrouped(),
      take_now: [{ task: bug('T-1') }, { task: bug('T-2') }, { task: bug('T-3') }] as SlaBugsBySection['take_now'],
    };

    const stats = buildSlaBugSidebarStats([], arrived, closed, grouped);

    expect(stats.slaRiskCount).toBe(3);
    expect(stats.arrivedThisWeek.total).toBe(2);
    expect(stats.arrivedThisWeek.byPriority.P3).toBe(1);
    expect(stats.arrivedThisWeek.tasksByPriority.P3[0]?.id).toBe('A-1');
    expect(stats.closedThisWeek.total).toBe(1);
    expect(stats.closedThisWeek.byPriority.P4).toBe(1);
  });
});
