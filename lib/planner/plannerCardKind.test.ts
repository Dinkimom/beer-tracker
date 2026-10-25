import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  isPlannerAnnotation,
  isPlannerAnnotationDraft,
  isPlannerClientOnlyCardId,
  isPlannerNonTrackerCard,
  isSavedPlannerAnnotation,
  parsePlannerCommentTaskId,
  parsePlannerLocalImageTaskId,
  type PlannerCardKind,
  resolvePlannerCardKind,
  toPlannerCommentTaskId,
  toPlannerLocalImageTaskId,
} from './plannerCardKind';

type DraftKind = Task['localDraftKind'];

const IDS = {
  saved: 'comment:11111111-1111-4111-8111-111111111111',
  draft: 'local-task-abc',
  localImage: 'local-image:abc',
  tracker: 'QUEUE-12',
} as const;

const DRAFT_KINDS: DraftKind[] = [undefined, 'comment', 'image', 'diagram', 'widget', 'task', 'existing'];

/** Ожидаемый kind для каждой пары (id × localDraftKind). Тип аннотации главнее id. */
const EXPECTED: Record<keyof typeof IDS, Record<string, PlannerCardKind>> = {
  saved: {
    undefined: 'note',
    comment: 'note',
    image: 'image',
    diagram: 'diagram',
    widget: 'widget',
    task: 'note',
    existing: 'note',
  },
  draft: {
    undefined: 'task',
    comment: 'note',
    image: 'image',
    diagram: 'diagram',
    widget: 'widget',
    task: 'task',
    existing: 'task',
  },
  localImage: {
    undefined: 'image',
    comment: 'note',
    image: 'image',
    diagram: 'diagram',
    widget: 'widget',
    task: 'image',
    existing: 'image',
  },
  tracker: {
    undefined: 'task',
    comment: 'note',
    image: 'image',
    diagram: 'diagram',
    widget: 'widget',
    task: 'task',
    existing: 'task',
  },
};

const rows = (Object.keys(IDS) as Array<keyof typeof IDS>).flatMap((idKey) =>
  DRAFT_KINDS.map((localDraftKind) => ({
    expected: EXPECTED[idKey][String(localDraftKind)]!,
    id: IDS[idKey],
    idKey,
    localDraftKind,
  }))
);

describe('resolvePlannerCardKind', () => {
  it.each(rows)('$idKey + $localDraftKind → $expected', ({ expected, id, localDraftKind }) => {
    const task = { id, localDraftKind };
    expect(resolvePlannerCardKind(task)).toBe(expected);
    expect(isPlannerAnnotation(task)).toBe(expected !== 'task');
    expect(isSavedPlannerAnnotation(task)).toBe(id === IDS.saved);
    expect(isPlannerAnnotationDraft(task)).toBe(expected !== 'task' && id !== IDS.saved);
  });

  it('treats an empty comment id as a plain id, not an annotation', () => {
    expect(resolvePlannerCardKind({ id: 'comment:' })).toBe('task');
    expect(resolvePlannerCardKind({ id: 'local-image:' })).toBe('task');
  });
});

describe('isPlannerNonTrackerCard', () => {
  it.each([
    [{ id: IDS.draft, isLocalTask: true }, true],
    [{ id: IDS.draft, isLocalTask: true, localDraftKind: 'task' as const }, true],
    [{ id: IDS.draft, isLocalTask: true, localDraftKind: 'comment' as const }, true],
    [{ id: IDS.saved, localDraftKind: 'widget' as const }, true],
    [{ id: IDS.localImage }, true],
    [{ id: IDS.tracker }, false],
    [{ id: IDS.tracker, localDraftKind: 'task' as const }, false],
  ])('%o → %s', (task, expected) => {
    expect(isPlannerNonTrackerCard(task)).toBe(expected);
  });
});

describe('planner card ids', () => {
  it('round-trips comment and local image ids', () => {
    expect(toPlannerCommentTaskId('abc')).toBe('comment:abc');
    expect(toPlannerCommentTaskId('comment:abc')).toBe('comment:abc');
    expect(parsePlannerCommentTaskId('comment:abc')).toBe('abc');
    expect(parsePlannerCommentTaskId('QUEUE-1')).toBeNull();
    expect(toPlannerLocalImageTaskId('x')).toBe('local-image:x');
    expect(parsePlannerLocalImageTaskId('local-image:x')).toBe('x');
  });

  it.each([
    ['local-task-1', true],
    ['local-image:1', true],
    ['comment:1', true],
    ['QUEUE-12', false],
    ['11111111-1111-4111-8111-111111111111', false],
  ])('client-only id %s → %s', (id, expected) => {
    expect(isPlannerClientOnlyCardId(id)).toBe(expected);
  });
});
