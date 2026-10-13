import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  groupTaskLinkRelationshipCaptions,
  mergeRelationshipMarkerPresence,
  resolveTaskLinkRelationshipCaption,
  resolveTaskLinkRelationshipForArrow,
  taskLinkRelationshipChipWraps,
  taskLinkRelationshipMessageKey,
} from './taskLinkRelationshipLabel';

function position(taskId: string, startDay: number): TaskPosition {
  return { assignee: 'dev', duration: 1, startDay, startPart: 0, taskId };
}

describe('resolveTaskLinkRelationshipForArrow', () => {
  it('keeps the stored type when the arrow follows from → to', () => {
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'blocks',
        startTaskId: 'a',
        toTaskId: 'b',
      })
    ).toBe('blocks');
  });

  it('inverts a directional type when the arrow is drawn toward the source', () => {
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'blocks',
        startTaskId: 'b',
        toTaskId: 'b',
      })
    ).toBe('blocked_by');
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'blocked_by',
        startTaskId: 'b',
        toTaskId: 'b',
      })
    ).toBe('blocks');
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'duplicates',
        startTaskId: 'b',
        toTaskId: 'b',
      })
    ).toBe('duplicated_by');
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'duplicated_by',
        startTaskId: 'b',
        toTaskId: 'b',
      })
    ).toBe('duplicates');
  });

  it('keeps relates in either direction', () => {
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'relates',
        startTaskId: 'b',
        toTaskId: 'b',
      })
    ).toBe('relates');
  });

  it('leaves an unknown type as stored when the arrow is reversed', () => {
    expect(
      resolveTaskLinkRelationshipForArrow({
        fromTaskId: 'a',
        relationship: 'custom_link',
        startTaskId: 'b',
        toTaskId: 'b',
      })
    ).toBe('custom_link');
  });
});

describe('resolveTaskLinkRelationshipCaption', () => {
  const translate = (key: string) => key;

  it('prefers the tracker phrase over the canonical type', () => {
    expect(
      resolveTaskLinkRelationshipCaption({
        fromTaskId: 'a',
        relationship: 'blocks',
        relationshipLabel: 'has to be done after',
        startTaskId: 'b',
        toTaskId: 'b',
        translate,
      })
    ).toBe('has to be done after');
  });

  it('falls back to the canonical label when the tracker phrase is absent', () => {
    expect(
      resolveTaskLinkRelationshipCaption({
        fromTaskId: 'a',
        relationship: 'relates',
        startTaskId: 'a',
        toTaskId: 'b',
        translate,
      })
    ).toBe('sprintPlanner.links.relationship.relates');
  });
});

describe('groupTaskLinkRelationshipCaptions', () => {
  const translate = (key: string) => key;

  it('drops relates when the same arrow has a specific type, even if relates is last', () => {
    const groups = groupTaskLinkRelationshipCaptions({
      links: [
        {
          fromTaskId: 'a',
          id: '1',
          relationshipLabel: 'has linked QA task',
          toTaskId: 'b',
        },
        {
          fromTaskId: 'b',
          id: '2',
          relationshipLabel: 'связана с задачей',
          toTaskId: 'a',
        },
      ],
      taskPositions: new Map([
        ['a', position('a', 0)],
        ['b', position('b', 2)],
      ]),
      translate,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.captions).toEqual(['has linked QA task']);
  });

  it('keeps relates when it is the only type on the arrow', () => {
    const groups = groupTaskLinkRelationshipCaptions({
      links: [
        {
          fromTaskId: 'a',
          id: '1',
          relationship: 'relates',
          relationshipLabel: 'relates to',
          toTaskId: 'b',
        },
      ],
      taskPositions: new Map([
        ['a', position('a', 0)],
        ['b', position('b', 2)],
      ]),
      translate,
    });
    expect(groups[0]?.captions).toEqual(['relates to']);
  });
});

describe('mergeRelationshipMarkerPresence', () => {
  const item = {
    captions: ['has linked QA task'],
    endTaskId: 'b',
    key: 'a\0b',
    startTaskId: 'a',
  };

  it('keeps a removed label while it exits', () => {
    expect(mergeRelationshipMarkerPresence([{ exiting: false, item }], [], false)).toEqual([
      { exiting: true, item },
    ]);
  });

  it('drops a removed label immediately when motion is reduced', () => {
    expect(mergeRelationshipMarkerPresence([{ exiting: false, item }], [], true)).toEqual([]);
  });
});

describe('taskLinkRelationshipChipWraps', () => {
  it('keeps a short label on one line and wraps a Jira phrase', () => {
    expect(taskLinkRelationshipChipWraps('Блокирует')).toBe(false);
    expect(taskLinkRelationshipChipWraps('has linked QA task')).toBe(true);
    expect(taskLinkRelationshipChipWraps('has linked TestOps task')).toBe(true);
  });
});

describe('taskLinkRelationshipMessageKey', () => {
  it('maps canonical types to planner link labels', () => {
    expect(taskLinkRelationshipMessageKey('relates')).toBe(
      'sprintPlanner.links.relationship.relates'
    );
    expect(taskLinkRelationshipMessageKey('blocks')).toBe(
      'sprintPlanner.links.relationship.blocks'
    );
    expect(taskLinkRelationshipMessageKey('blocked_by')).toBe(
      'sprintPlanner.links.relationship.blockedBy'
    );
    expect(taskLinkRelationshipMessageKey('duplicates')).toBe(
      'sprintPlanner.links.relationship.duplicates'
    );
    expect(taskLinkRelationshipMessageKey('duplicated_by')).toBe(
      'sprintPlanner.links.relationship.duplicatedBy'
    );
  });

  it('returns null for a type without a label', () => {
    expect(taskLinkRelationshipMessageKey('custom_link')).toBeNull();
  });
});
