import { describe, expect, it } from 'vitest';

import {
  GITLAB_FACT_CHIP_SIZE_PX,
  GITLAB_FACT_CHIP_STACK_GAP_PX,
  OCCUPANCY_FACT_STATUS_BAND_PX,
  computeOccupancyFactRowHeightPx,
  layoutFactTimelineMarkers,
} from './gitlabFactTimelineLayoutHelpers';

describe('layoutFactTimelineMarkers', () => {
  const pitch = GITLAB_FACT_CHIP_SIZE_PX + GITLAB_FACT_CHIP_STACK_GAP_PX;
  const overhang = GITLAB_FACT_CHIP_SIZE_PX / 2 + 2;
  const t0 = Date.parse('2026-01-01T12:00:00.000Z');

  function atMinutes(minutes: number): string {
    return new Date(t0 + minutes * 60_000).toISOString();
  }

  it('does not stack when sources are more than an hour apart', () => {
    const layout = layoutFactTimelineMarkers([
      { at: atMinutes(0), key: 'g1', source: 'gitlab' },
      { at: atMinutes(61), key: 'c1', source: 'comment' },
    ]);
    expect(layout.topByKey.get('g1')).toBe(0);
    expect(layout.topByKey.get('c1')).toBe(0);
    expect(layout.heightPx).toBe(OCCUPANCY_FACT_STATUS_BAND_PX + overhang);
  });

  it('stacks within an hour: gitlab on top, comment near the bar', () => {
    const layout = layoutFactTimelineMarkers([
      { at: atMinutes(0), key: 'g1', source: 'gitlab' },
      { at: atMinutes(30), key: 'c1', source: 'comment' },
    ]);
    expect(layout.topByKey.get('g1')).toBe(0);
    expect(layout.topByKey.get('c1')).toBe(pitch);
    expect(layout.heightPx).toBe(OCCUPANCY_FACT_STATUS_BAND_PX + overhang + pitch);
  });

  it('stacks top-to-bottom gitlab → reestimation → comment', () => {
    const layout = layoutFactTimelineMarkers([
      { at: atMinutes(0), key: 'g1', source: 'gitlab' },
      { at: atMinutes(20), key: 'r1', source: 'reestimation' },
      { at: atMinutes(40), key: 'c1', source: 'comment' },
    ]);
    expect(layout.topByKey.get('g1')).toBe(0);
    expect(layout.topByKey.get('r1')).toBe(pitch);
    expect(layout.topByKey.get('c1')).toBe(2 * pitch);
  });

  it('does not stack same-source-only clusters', () => {
    const layout = layoutFactTimelineMarkers([
      { at: atMinutes(0), key: 'c1', source: 'comment' },
      { at: atMinutes(10), key: 'c2', source: 'comment' },
    ]);
    expect(layout.topByKey.get('c1')).toBe(0);
    expect(layout.topByKey.get('c2')).toBe(0);
    expect(layout.heightPx).toBe(OCCUPANCY_FACT_STATUS_BAND_PX + overhang);
  });
});

describe('computeOccupancyFactRowHeightPx', () => {
  it('keeps status-only fact row at the status band height', () => {
    expect(
      computeOccupancyFactRowHeightPx({
        showComments: false,
        showGitlab: true,
        showReestimations: false,
      })
    ).toBe(OCCUPANCY_FACT_STATUS_BAND_PX);
  });

  it('does not grow extra lanes for gitlab-only events', () => {
    const height = computeOccupancyFactRowHeightPx({
      gitlabEvents: [
        { at: '2026-01-01T12:00:00.000Z', kind: 'approved' },
        { at: '2026-01-01T12:05:00.000Z', kind: 'pipeline_success' },
      ],
      showComments: false,
      showGitlab: true,
      showReestimations: false,
    });
    const overhang = GITLAB_FACT_CHIP_SIZE_PX / 2 + 2;
    expect(height).toBe(OCCUPANCY_FACT_STATUS_BAND_PX + overhang);
  });
});
