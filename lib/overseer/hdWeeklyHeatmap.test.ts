import { describe, expect, it } from 'vitest';

import {
  aggregateHdWeeklyCounts,
  applyCreationWeekHdBaseline,
  buildHdWeeklyHeatmapPayload,
  buildHdWeeklyHeatmapSeries,
  hdHeatmapGridRows,
  hdHeatmapLevel,
  startOfUtcIsoWeekIso,
  weekKeyFromDateOnly,
} from './hdWeeklyHeatmap';

describe('hdWeeklyHeatmap', () => {
  it('startOfUtcIsoWeekIso returns Monday UTC', () => {
    expect(startOfUtcIsoWeekIso(Date.parse('2026-06-18T12:00:00.000Z'))).toBe('2026-06-15');
    expect(startOfUtcIsoWeekIso(Date.parse('2026-06-15T00:00:00.000Z'))).toBe('2026-06-15');
  });

  it('buildHdWeeklyHeatmapSeries fills missing weeks with zero', () => {
    const rangeStartMs = Date.parse('2026-06-01T00:00:00.000Z');
    const nowMs = Date.parse('2026-06-22T12:00:00.000Z');
    const weeks = buildHdWeeklyHeatmapSeries(
      [{ weekStart: '2026-06-08', count: 2 }],
      rangeStartMs,
      nowMs
    );
    expect(weeks.map((w) => w.weekStart)).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
    ]);
    expect(weeks.map((w) => w.count)).toEqual([0, 2, 0, 0]);
  });

  it('buildHdWeeklyHeatmapPayload uses createdAt as range start', () => {
    const payload = buildHdWeeklyHeatmapPayload(
      [{ weekStart: '2026-06-08', count: 5 }],
      '2026-06-10T08:00:00.000Z',
      Date.parse('2026-06-22T12:00:00.000Z')
    );
    expect(payload.rangeStart).toBe('2026-06-08');
    expect(payload.maxCount).toBe(5);
    expect(payload.weeks.at(-1)?.weekStart).toBe('2026-06-22');
  });

  it('aggregateHdWeeklyCounts normalizes date-only keys to UTC ISO Monday', () => {
    expect(aggregateHdWeeklyCounts([{ weekStart: '2026-06-17', count: 4 }])).toEqual([
      { weekStart: '2026-06-15', count: 4 },
    ]);
  });

  it('maps weekly deltas into series weeks instead of dumping all hdCount to creation', () => {
    const payload = buildHdWeeklyHeatmapPayload(
      [
        { weekStart: '2026-06-15', count: 10 },
        { weekStart: '2026-06-22', count: 17 },
      ],
      '2026-06-10T08:00:00.000Z',
      Date.parse('2026-06-25T12:00:00.000Z'),
      27
    );
    expect(payload.weeks.find((week) => week.weekStart === '2026-06-08')?.count).toBe(0);
    expect(payload.weeks.find((week) => week.weekStart === '2026-06-15')?.count).toBe(10);
    expect(payload.weeks.find((week) => week.weekStart === '2026-06-22')?.count).toBe(17);
    expect(payload.maxCount).toBe(17);
  });

  it('adds untracked hd count to creation week when changelog is empty', () => {
    const payload = buildHdWeeklyHeatmapPayload(
      [],
      '2026-06-10T08:00:00.000Z',
      Date.parse('2026-06-22T12:00:00.000Z'),
      27
    );
    expect(payload.weeks.find((week) => week.weekStart === '2026-06-08')?.count).toBe(27);
    expect(payload.maxCount).toBe(27);
  });

  it('applyCreationWeekHdBaseline adds only missing amount', () => {
    const weeks = applyCreationWeekHdBaseline(
      [
        { weekStart: '2026-06-08', count: 10 },
        { weekStart: '2026-06-15', count: 5 },
      ],
      '2026-06-10T08:00:00.000Z',
      27,
      2
    );
    expect(weeks.find((week) => week.weekStart === '2026-06-08')?.count).toBe(22);
    expect(weeks.find((week) => week.weekStart === '2026-06-15')?.count).toBe(5);
  });

  it('applyCreationWeekHdBaseline skips hdCount dump when raw rows exist but series is empty', () => {
    const weeks = applyCreationWeekHdBaseline(
      [
        { weekStart: '2026-06-08', count: 0 },
        { weekStart: '2026-06-15', count: 0 },
      ],
      '2026-06-10T08:00:00.000Z',
      27,
      3
    );
    expect(weeks.every((week) => week.count === 0)).toBe(true);
  });

  it('weekKeyFromDateOnly aligns with startOfUtcIsoWeekIso', () => {
    expect(weekKeyFromDateOnly('2026-06-18')).toBe(startOfUtcIsoWeekIso(Date.parse('2026-06-18T12:00:00.000Z')));
  });

  it('hdHeatmapLevel maps relative intensity', () => {
    expect(hdHeatmapLevel(0, 10)).toBe(0);
    expect(hdHeatmapLevel(1, 8)).toBe(1);
    expect(hdHeatmapLevel(3, 8)).toBe(2);
    expect(hdHeatmapLevel(5, 8)).toBe(3);
    expect(hdHeatmapLevel(8, 8)).toBe(4);
  });

  it('hdHeatmapGridRows chunks by columns', () => {
    expect(hdHeatmapGridRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
