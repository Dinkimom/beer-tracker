import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import {
  evaluateEmbeddedTestingOnlyPredicate,
  padEmbeddedTestingOnlyJoins,
} from './evaluateEmbeddedTestingOnlyRules';

function issue(partial: Partial<TrackerIssue> & { storyPoints?: number; testPoints?: number }): TrackerIssue {
  return {
    id: '1',
    key: 'Q-1',
    self: '',
    summary: 'x',
    ...partial,
  } as TrackerIssue;
}

describe('evaluateEmbeddedTestingOnlyPredicate', () => {
  it('eq on storyPoints numeric', () => {
    const ok = evaluateEmbeddedTestingOnlyPredicate(
      issue({ storyPoints: 3 }),
      [{ fieldId: 'storyPoints', operator: 'eq', value: '3' }],
      []
    );
    expect(ok).toBe(true);
  });

  it('gt on storyPoints', () => {
    expect(
      evaluateEmbeddedTestingOnlyPredicate(
        issue({ storyPoints: 5 }),
        [{ fieldId: 'storyPoints', operator: 'gt', value: '4' }],
        []
      )
    ).toBe(true);
    expect(
      evaluateEmbeddedTestingOnlyPredicate(
        issue({ storyPoints: 3 }),
        [{ fieldId: 'storyPoints', operator: 'gt', value: '4' }],
        []
      )
    ).toBe(false);
  });

  it('and / or chain', () => {
    const rules = [
      { fieldId: 'storyPoints', operator: 'eq' as const, value: '0' },
      { fieldId: 'testPoints', operator: 'gt' as const, value: '0' },
    ];
    expect(
      evaluateEmbeddedTestingOnlyPredicate(issue({ storyPoints: 0, testPoints: 2 }), rules, ['and'])
    ).toBe(true);
    expect(
      evaluateEmbeddedTestingOnlyPredicate(issue({ storyPoints: 0, testPoints: 0 }), rules, ['and'])
    ).toBe(false);
    expect(
      evaluateEmbeddedTestingOnlyPredicate(issue({ storyPoints: 5, testPoints: 3 }), rules, ['or'])
    ).toBe(true);
  });

  it('padEmbeddedTestingOnlyJoins fills with and', () => {
    expect(padEmbeddedTestingOnlyJoins(3, ['or'])).toEqual(['or', 'and']);
  });

  it('matches eq by object key/display/id tokens', () => {
    expect(
      evaluateEmbeddedTestingOnlyPredicate(
        issue({
          queue: { key: 'NW', display: 'NW Queue', id: '12' },
        } as Partial<TrackerIssue> & { storyPoints?: number; testPoints?: number }),
        [{ fieldId: 'queue', operator: 'eq', value: 'NW' }],
        []
      )
    ).toBe(true);
  });

  it('matches eq by custom field string token', () => {
    expect(
      evaluateEmbeddedTestingOnlyPredicate(
        issue({ customQueue: 'NW' } as Partial<TrackerIssue> & { storyPoints?: number; testPoints?: number }),
        [{ fieldId: 'customQueue', operator: 'eq', value: 'NW' }],
        []
      )
    ).toBe(true);
  });

  it('matches eq by snake_case fallback for custom field id', () => {
    expect(
      evaluateEmbeddedTestingOnlyPredicate(
        issue({ custom_queue: { key: 'NW' } } as Partial<TrackerIssue> & { storyPoints?: number; testPoints?: number }),
        [{ fieldId: 'customQueue', operator: 'eq', value: 'NW' }],
        []
      )
    ).toBe(true);
  });

  it('matches eq by tokens inside array field values', () => {
    expect(
      evaluateEmbeddedTestingOnlyPredicate(
        issue({
          queues: [{ key: 'NW', display: 'NW Queue' }],
        } as Partial<TrackerIssue> & { storyPoints?: number; testPoints?: number }),
        [{ fieldId: 'queues', operator: 'eq', value: 'NW' }],
        []
      )
    ).toBe(true);
  });

});
