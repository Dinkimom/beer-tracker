import { describe, expect, it } from 'vitest';

import {
  parseTrackerStatusRowsMeta,
  remapStatusKeyToStatusId,
  remapStatusPaletteKeysToStatusId,
  trackerStatusIdentity,
} from './useTrackerIntegrationApiHelpers';

describe('trackerStatusIdentity', () => {
  it('prefers id when present', () => {
    expect(trackerStatusIdentity({ id: '10001', key: 'исследование' })).toBe('10001');
  });

  it('falls back to key when id is missing', () => {
    expect(trackerStatusIdentity({ key: 'open' })).toBe('open');
  });
});

describe('parseTrackerStatusRowsMeta', () => {
  it('keeps id even when it equals key', () => {
    expect(
      parseTrackerStatusRowsMeta([
        { display: 'Open', id: 'open', key: 'open', statusType: { key: 'new' } },
      ])
    ).toEqual([
      {
        display: 'Open',
        id: 'open',
        key: 'open',
        statusTypeKey: 'new',
      },
    ]);
  });

  it('keeps distinct Jira id alongside name key', () => {
    expect(
      parseTrackerStatusRowsMeta([
        { display: 'In Progress', id: '3', key: 'inprogress', statusType: { key: 'inProgress' } },
      ])
    ).toEqual([
      {
        display: 'In Progress',
        id: '3',
        key: 'inprogress',
        statusTypeKey: 'inProgress',
      },
    ]);
  });

  it('keeps two rows that share a normalized name key but have different ids', () => {
    const rows = parseTrackerStatusRowsMeta([
      { display: 'Исследование', id: '10001', key: 'исследование' },
      { display: 'Исследование ', id: '10002', key: 'исследование' },
    ]);
    expect(rows.map((r) => trackerStatusIdentity(r))).toEqual(['10001', '10002']);
  });
});

describe('remapStatusPaletteKeysToStatusId', () => {
  it('remaps legacy name keys onto status ids', () => {
    expect(
      remapStatusPaletteKeysToStatusId(
        { open: 'closed', вработе: 'review' },
        [
          { id: '10001', key: 'вработе' },
          { key: 'open' },
        ]
      )
    ).toEqual({ open: 'closed', '10001': 'review' });
  });

  it('prefers existing id-keyed entry over name remap', () => {
    expect(
      remapStatusPaletteKeysToStatusId(
        { '10001': 'review', вработе: 'brown' },
        [{ id: '10001', key: 'вработе' }]
      )
    ).toEqual({ '10001': 'review' });
  });

  it('leaves palette unchanged when statuses have no distinct ids', () => {
    const palette = { open: 'closed' };
    expect(remapStatusPaletteKeysToStatusId(palette, [{ key: 'open' }])).toBe(palette);
  });
});

describe('remapStatusKeyToStatusId', () => {
  it('maps name key to id', () => {
    expect(
      remapStatusKeyToStatusId('вработе', [{ id: '10001', key: 'вработе' }])
    ).toBe('10001');
  });

  it('leaves key unchanged when no id mapping exists', () => {
    expect(remapStatusKeyToStatusId('open', [{ key: 'open' }])).toBe('open');
  });
});
