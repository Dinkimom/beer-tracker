import { describe, expect, it } from 'vitest';

import {
  defaultPaletteKeyForTrackerStatus,
  resolveStatusColorKey,
  visualTokenForStatusKey,
} from './statusPalette';

describe('visualTokenForStatusKey', () => {
  it('returns exact-key visualToken', () => {
    expect(
      visualTokenForStatusKey('inProgress', { inProgress: { visualToken: 'closed' } })
    ).toBe('closed');
  });

  it('matches normalized tracker status keys', () => {
    expect(
      visualTokenForStatusKey('in_progress', { inProgress: { visualToken: 'brown' } })
    ).toBe('brown');
  });

  it('matches alternate keys (status id overrides take precedence)', () => {
    expect(
      visualTokenForStatusKey('вработе', { '10001': { visualToken: 'review' } }, ['10001'])
    ).toBe('review');
  });

  it('prefers status id override over conflicting name-key override', () => {
    expect(
      visualTokenForStatusKey(
        'вработе',
        {
          '10001': { visualToken: 'review' },
          вработе: { visualToken: 'brown' },
        },
        ['10001']
      )
    ).toBe('review');
  });

  it('returns undefined without override', () => {
    expect(visualTokenForStatusKey('open', { closed: { visualToken: 'closed' } })).toBeUndefined();
  });
});

describe('defaultPaletteKeyForTrackerStatus / resolveStatusColorKey', () => {
  it('prefers known status-key palette over Jira inProgress category', () => {
    expect(defaultPaletteKeyForTrackerStatus('blocked', 'inProgress')).toBe('blocked');
    expect(resolveStatusColorKey('blocked', 'inProgress', null)).toBe('blocked');
  });

  it('falls back to type palette for unknown status keys', () => {
    expect(defaultPaletteKeyForTrackerStatus('customClosed', 'done')).toBe('closed');
  });

  it('prefers visualToken override over status-key and type defaults', () => {
    expect(
      resolveStatusColorKey('blocked', 'inProgress', {
        blocked: { visualToken: 'inprogress' },
      })
    ).toBe('inprogress');
  });
});
