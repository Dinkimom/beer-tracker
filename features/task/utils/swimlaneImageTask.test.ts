import { describe, expect, it } from 'vitest';

import {
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
});
