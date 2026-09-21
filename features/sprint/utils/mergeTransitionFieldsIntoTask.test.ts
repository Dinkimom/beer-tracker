import { describe, expect, it } from 'vitest';

import { mergeTransitionExtraFieldsIntoTask } from './mergeTransitionFieldsIntoTask';

describe('mergeTransitionExtraFieldsIntoTask', () => {
  it('merges sprint array with id into sprints', () => {
    const patch = mergeTransitionExtraFieldsIntoTask({
      sprint: [{ id: '42', display: 'ignored' }],
    });
    expect(patch.sprints).toEqual([{ id: '42', display: '42' }]);
  });

  it('merges storyPoints and assignee', () => {
    const patch = mergeTransitionExtraFieldsIntoTask({
      assignee: 'u1',
      storyPoints: 5,
    });
    expect(patch.storyPoints).toBe(5);
    expect(patch.assignee).toBe('u1');
  });

  it('ignores resolution and comment', () => {
    const patch = mergeTransitionExtraFieldsIntoTask({
      comment: 'x',
      resolution: 'fixed',
      storyPoints: 3,
    });
    expect(patch).toEqual({ storyPoints: 3 });
  });

  it('maps bizErpTeam to productTeam', () => {
    const patch = mergeTransitionExtraFieldsIntoTask({
      bizErpTeam: ['a', 'b'],
    });
    expect(patch.productTeam).toEqual(['a', 'b']);
  });

  it('merges testPoints and coerces string numbers', () => {
    expect(
      mergeTransitionExtraFieldsIntoTask({
        testPoints: 2,
      })
    ).toEqual({ testPoints: 2 });
    expect(
      mergeTransitionExtraFieldsIntoTask({
        testPoints: '1.5',
      })
    ).toEqual({ testPoints: 1.5 });
  });

  it('merges qaEngineer from string or single-element array', () => {
    expect(mergeTransitionExtraFieldsIntoTask({ qaEngineer: 'qa1' })).toEqual({ qaEngineer: 'qa1' });
    expect(mergeTransitionExtraFieldsIntoTask({ qaEngineer: ['qa2'] })).toEqual({
      qaEngineer: 'qa2',
    });
  });

  it('merges functionalTeam and stage', () => {
    expect(
      mergeTransitionExtraFieldsIntoTask({
        functionalTeam: 'ft',
        stage: 'review',
      })
    ).toEqual({ functionalTeam: 'ft', stage: 'review' });
  });

  it('returns empty sprint when array empty or missing id', () => {
    expect(mergeTransitionExtraFieldsIntoTask({ sprint: [] })).toEqual({});
    expect(mergeTransitionExtraFieldsIntoTask({ sprint: [{}] })).toEqual({});
  });

  it('ignores unknown mergeable-looking keys not in allowlist', () => {
    expect(
      mergeTransitionExtraFieldsIntoTask({
        randomField: 'x',
      } as Record<string, unknown>)
    ).toEqual({});
  });

  it('returns empty object for undefined or non-object', () => {
    expect(mergeTransitionExtraFieldsIntoTask(undefined)).toEqual({});
    expect(mergeTransitionExtraFieldsIntoTask(null as unknown as Record<string, unknown>)).toEqual(
      {}
    );
  });
});
