import { describe, expect, it } from 'vitest';

import {
  buildStatusDefaultsFromTrackerStatuses,
  defaultPaletteKeyForTrackerStatusType,
  mapTrackerStatusTypeKeyToCategory,
  trackerStatusTypeSectionSortWeight,
} from './statusTypeDefaults';

describe('statusTypeDefaults', () => {
  it('mapTrackerStatusTypeKeyToCategory uses type keys, not status-name substrings', () => {
    expect(mapTrackerStatusTypeKeyToCategory('inProgress')).toBe('in-progress');
    expect(mapTrackerStatusTypeKeyToCategory('done')).toBe('done');
    expect(mapTrackerStatusTypeKeyToCategory('new')).toBe('todo');
    // Не путать имя статуса с типом: «готово к разработке» ≠ done
    expect(mapTrackerStatusTypeKeyToCategory('готово к разработке')).toBeUndefined();
    expect(mapTrackerStatusTypeKeyToCategory('готово')).toBeUndefined();
  });

  it('defaultPaletteKeyForTrackerStatusType maps types to known palette keys', () => {
    expect(defaultPaletteKeyForTrackerStatusType('inProgress')).toBe('inprogress');
    expect(defaultPaletteKeyForTrackerStatusType('done')).toBe('closed');
    expect(defaultPaletteKeyForTrackerStatusType('new')).toBe('backlog');
    expect(defaultPaletteKeyForTrackerStatusType('paused')).toBe('blocked');
    expect(defaultPaletteKeyForTrackerStatusType(undefined)).toBeUndefined();
  });

  it('trackerStatusTypeSectionSortWeight orders todo → progress → paused → done', () => {
    expect(trackerStatusTypeSectionSortWeight('new')).toBeLessThan(
      trackerStatusTypeSectionSortWeight('inProgress')
    );
    expect(trackerStatusTypeSectionSortWeight('inProgress')).toBeLessThan(
      trackerStatusTypeSectionSortWeight('done')
    );
  });

  it('buildStatusDefaultsFromTrackerStatuses groups by status type key', () => {
    const defaults = buildStatusDefaultsFromTrackerStatuses([
      {
        display: 'A',
        id: '1',
        key: 'a',
        statusType: { key: 'inProgress' },
      },
      {
        display: 'B',
        id: '2',
        key: 'b',
        statusType: { key: 'inProgress' },
      },
    ]);
    expect(defaults.inProgress).toBe('in-progress');
  });
});
