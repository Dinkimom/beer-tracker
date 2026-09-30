import { describe, expect, it } from 'vitest';

import {
  mergeTransitionFieldsById,
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

describe('mergeTransitionFieldsById', () => {
  it('returns extra when base is empty', () => {
    const comment = { id: 'comment', display: 'Комментарий', required: true };
    expect(mergeTransitionFieldsById([], [comment])).toEqual([comment]);
  });

  it('adds missing required fields from error recovery', () => {
    const comment = { id: 'comment', display: 'Комментарий', required: true, schemaType: 'string' };
    expect(mergeTransitionFieldsById([resolutionField], [comment])).toEqual([
      resolutionField,
      comment,
    ]);
  });

  it('marks overlapping fields required if either side is required', () => {
    expect(
      mergeTransitionFieldsById(
        [{ id: 'comment', display: 'Comment', required: false }],
        [{ id: 'comment', display: 'Комментарий', required: true, schemaType: 'string' }]
      )
    ).toEqual([{ id: 'comment', display: 'Комментарий', required: true, schemaType: 'string' }]);
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
