import { describe, expect, it } from 'vitest';

import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';

import {
  computeHasAssigneeRowContent,
  mergeOccupancyRowFields,
  shouldShowTestPoints,
  unplannedWarningMessage,
} from './occupancyTaskCellHelpers';

describe('mergeOccupancyRowFields', () => {
  it('merges with defaults', () => {
    const m = mergeOccupancyRowFields({ showKey: false });
    expect(m.showKey).toBe(false);
    expect(m.showStatus).toBe(true);
  });
});

describe('shouldShowTestPoints', () => {
  it('QA team or has qa task with hasQa', () => {
    expect(shouldShowTestPoints({ team: 'QA' } as never, false, null)).toBe(true);
    expect(shouldShowTestPoints({ team: 'X' } as never, true, { id: 'q' } as never)).toBe(true);
    expect(shouldShowTestPoints({ team: 'X' } as never, true, null)).toBe(false);
  });

  it('returns false when integration hides TP in standalone flow', () => {
    expect(
      shouldShowTestPoints(
        { hideTestPointsByIntegration: true, team: 'QA' } as never,
        true,
        { id: 'q' } as never
      )
    ).toBe(false);
  });
});

describe('getIncidentSeverityTagClasses', () => {
  it('maps tiers', () => {
    expect(getIncidentSeverityTagClasses('P1')).toContain('red');
    expect(getIncidentSeverityTagClasses('P3')).toContain('amber');
  });
});

describe('unplannedWarningMessage', () => {
  it('returns messages or null', () => {
    expect(unplannedWarningMessage('all')).toBe('Не запланирована');
    expect(unplannedWarningMessage(null)).toBeNull();
  });
});

describe('computeHasAssigneeRowContent', () => {
  it('true when assignee name shown', () => {
    expect(
      computeHasAssigneeRowContent({
        assigneeDisplayName: 'A',
        fields: mergeOccupancyRowFields(),
        shouldShowTp: false,
        task: { id: '1' } as never,
      })
    ).toBe(true);
  });
});
