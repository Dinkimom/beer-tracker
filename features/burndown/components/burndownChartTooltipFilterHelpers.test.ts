import type { BurndownDayChangelogItem } from './burndownChartTooltipContext';

import { describe, expect, it } from 'vitest';

import { resolveBurndownTooltipDayChangelog } from './burndownChartCustomTooltipHelpers';
import {
  applyBurndownChangelogRemainingDeltas,
  burndownChangelogItemDisplayType,
  burndownChangelogItemMatchesMetric,
  formatBurndownNumericChange,
  isBurndownChangelogCloseEvent,
} from './burndownChartTooltipFilterHelpers';
import { filterBurndownDayChangelog } from './burndownChartTooltipHelpers';

function item(overrides: Partial<BurndownDayChangelogItem>): BurndownDayChangelogItem {
  return {
    change: 0,
    changeTP: 0,
    issueKey: 'CM-1',
    remainingSP: 0,
    remainingTP: 0,
    summary: 'Task',
    type: 'status_change',
    ...overrides,
  };
}

describe('burndownChangelogItemMatchesMetric', () => {
  it('оставляет добавление, снятие и закрытие', () => {
    expect(burndownChangelogItemMatchesMetric(item({ type: 'added' }), false)).toBe(true);
    expect(burndownChangelogItemMatchesMetric(item({ type: 'removed' }), false)).toBe(true);
    expect(burndownChangelogItemMatchesMetric(item({ type: 'closed' }), false)).toBe(true);
  });

  it('оставляет переход в done и скрывает промежуточные статусы', () => {
    expect(
      burndownChangelogItemMatchesMetric(
        item({ type: 'status_change', statusFromKey: 'inProgress', statusToKey: 'closed' }),
        false
      )
    ).toBe(true);
    expect(
      burndownChangelogItemMatchesMetric(
        item({
          type: 'status_change',
          statusFromKey: 'readyForDevelopment',
          statusToKey: 'inProgress',
        }),
        false
      )
    ).toBe(false);
  });

  it('скрывает переоценку и смену поля спринта', () => {
    expect(burndownChangelogItemMatchesMetric(item({ type: 'reestimated', change: 3 }), false)).toBe(
      false
    );
    expect(
      burndownChangelogItemMatchesMetric(item({ type: 'story_points_change', change: 2 }), false)
    ).toBe(false);
    expect(burndownChangelogItemMatchesMetric(item({ type: 'sprint_field_change' }), false)).toBe(
      false
    );
  });
});

describe('isBurndownChangelogCloseEvent', () => {
  it('не считает повторное закрытие и открытие заново', () => {
    expect(
      isBurndownChangelogCloseEvent(
        item({ type: 'status_change', statusFromKey: 'closed', statusToKey: 'closed' })
      )
    ).toBe(false);
    expect(
      isBurndownChangelogCloseEvent(
        item({ type: 'status_change', statusFromKey: 'closed', statusToKey: 'inProgress' })
      )
    ).toBe(false);
    expect(
      isBurndownChangelogCloseEvent(
        item({ type: 'status_change', statusFromKey: 'inProgress', statusToKey: 'rc' })
      )
    ).toBe(true);
  });
});

describe('burndownChangelogItemDisplayType', () => {
  it('показывает закрытие вместо сырого status_change', () => {
    expect(burndownChangelogItemDisplayType(item({ type: 'added' }))).toBe('added');
    expect(burndownChangelogItemDisplayType(item({ type: 'removed' }))).toBe('removed');
    expect(
      burndownChangelogItemDisplayType(
        item({ type: 'status_change', statusFromKey: 'inProgress', statusToKey: 'closed' })
      )
    ).toBe('closed');
  });
});

describe('filterBurndownDayChangelog', () => {
  it('оставляет только scope-события дня', () => {
    const filtered = filterBurndownDayChangelog(
      [
        item({ type: 'status_change', statusFromKey: 'readyForDevelopment', statusToKey: 'inProgress' }),
        item({ type: 'added', change: 5 }),
        item({ type: 'story_points_change', change: 2 }),
        item({ type: 'status_change', statusFromKey: 'inProgress', statusToKey: 'closed', change: -5 }),
        item({ type: 'removed', change: -3 }),
      ],
      false
    );
    expect(filtered.map((row) => row.type)).toEqual(['added', 'status_change', 'removed']);
  });
});

describe('applyBurndownChangelogRemainingDeltas', () => {
  it('восстанавливает дельту закрытия из остатка, даже если change в API равен 0', () => {
    const rows = applyBurndownChangelogRemainingDeltas(
      [
        item({
          type: 'status_change',
          statusFromKey: 'readyForDevelopment',
          statusToKey: 'inProgress',
          remainingSP: 29,
        }),
        item({
          type: 'status_change',
          statusFromKey: 'inProgress',
          statusToKey: 'closed',
          remainingSP: 21,
        }),
      ],
      29,
      0
    );
    expect(rows[0]?.change).toBe(0);
    expect(rows[1]?.change).toBe(-8);
  });
});

describe('resolveBurndownTooltipDayChangelog', () => {
  it('после фильтра показывает закрытие с дельтой по остатку', () => {
    const rows = resolveBurndownTooltipDayChangelog(
      {
        dayStartRemainingSP: 29,
        dayStartRemainingTP: 0,
        dayChangelog: [
          item({
            type: 'status_change',
            statusFromKey: 'readyForDevelopment',
            statusToKey: 'inProgress',
            remainingSP: 29,
          }),
          item({
            type: 'status_change',
            statusFromKey: 'inProgress',
            statusToKey: 'closed',
            remainingSP: 21,
          }),
        ],
      },
      false,
      filterBurndownDayChangelog
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.change).toBe(-8);
  });
});

describe('formatBurndownNumericChange', () => {
  it('не рисует +0', () => {
    expect(formatBurndownNumericChange(0)).toEqual({ changeStr: '—', changeColor: '#9ca3af' });
    expect(formatBurndownNumericChange(-5)).toEqual({ changeStr: '-5', changeColor: '#16a34a' });
    expect(formatBurndownNumericChange(3)).toEqual({ changeStr: '+3', changeColor: '#dc2626' });
  });
});
