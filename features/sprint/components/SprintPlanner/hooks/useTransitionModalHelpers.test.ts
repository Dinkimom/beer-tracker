import { describe, expect, it } from 'vitest';

import {
  pickTransitionFields,
  resolveCachedTransitionFields,
  shouldOpenTransitionFieldsModal,
} from './useTransitionModalHelpers';

const resolutionField = {
  id: 'resolution',
  display: 'Resolution',
  required: true,
};

describe('resolveCachedTransitionFields', () => {
  const screens = {
    task: {
      close: [resolutionField],
      closedMeta: [resolutionField],
    },
    bug: {
      resolve: [{ id: 'comment', display: 'Comment', required: false }],
    },
  };

  it('finds fields by transition id', () => {
    expect(resolveCachedTransitionFields(screens, 'task', 'close')).toEqual([resolutionField]);
  });

  it('falls back to targetStatusKey Meta key', () => {
    expect(resolveCachedTransitionFields(screens, 'task', 'unknown-id', 'closed')).toEqual([
      resolutionField,
    ]);
  });

  it('falls back to task type when type key is missing', () => {
    expect(resolveCachedTransitionFields(screens, 'unknown-type', 'close')).toEqual([
      resolutionField,
    ]);
  });

  it('returns empty when nothing matches', () => {
    expect(resolveCachedTransitionFields(screens, 'bug', 'missing')).toEqual([]);
  });
});

describe('pickTransitionFields', () => {
  it('prefers fetched fields', () => {
    const fetched = [{ id: 'resolution', display: 'Res', required: true, options: ['fixed'] }];
    expect(pickTransitionFields(fetched, [resolutionField])).toEqual(fetched);
  });

  it('falls back to cache when fetch is empty', () => {
    expect(pickTransitionFields([], [resolutionField])).toEqual([resolutionField]);
  });
});

describe('shouldOpenTransitionFieldsModal', () => {
  it('opens when screen has fields even if none are required', () => {
    expect(
      shouldOpenTransitionFieldsModal([{ id: 'comment', display: 'Comment', required: false }])
    ).toBe(true);
  });

  it('does not open when there are no fields', () => {
    expect(shouldOpenTransitionFieldsModal([])).toBe(false);
  });
});
