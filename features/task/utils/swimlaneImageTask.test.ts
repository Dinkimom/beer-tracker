import { describe, expect, it } from 'vitest';

import {
  isPlannerAnnotationTask,
  isSwimlaneImageTask,
  parseSwimlaneImageTaskId,
  toSwimlaneImageTaskId,
} from './swimlaneImageTask';

describe('swimlaneImageTask', () => {
  it('round-trips local image ids', () => {
    expect(toSwimlaneImageTaskId('abc')).toBe('local-image:abc');
    expect(parseSwimlaneImageTaskId('local-image:abc')).toBe('abc');
    expect(parseSwimlaneImageTaskId('QUEUE-1')).toBeNull();
  });

  it('detects photo cards by kind or id', () => {
    expect(isSwimlaneImageTask({ id: 'local-image:1', localDraftKind: 'image' })).toBe(true);
    expect(isSwimlaneImageTask({ id: 'local-task-1', localDraftKind: 'image' })).toBe(true);
    expect(isSwimlaneImageTask({ id: 'QUEUE-1', localDraftKind: 'task' })).toBe(false);
  });

  it('treats drafts, notes, and photos as planner annotations', () => {
    expect(isPlannerAnnotationTask({ id: 'local-task-1', isLocalTask: true })).toBe(true);
    expect(isPlannerAnnotationTask({ id: 'comment:1', localDraftKind: 'comment' })).toBe(true);
    expect(isPlannerAnnotationTask({ id: 'comment:1', localDraftKind: 'diagram' })).toBe(true);
    expect(isPlannerAnnotationTask({ id: 'comment:1', localDraftKind: 'image' })).toBe(true);
    expect(isPlannerAnnotationTask({ id: 'QUEUE-1', localDraftKind: 'task' })).toBe(false);
  });
});
