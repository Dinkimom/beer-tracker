import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { resolveAgentChatOrigin } from './agentChatOrigin';

const task = { assigneeName: 'Nikita', id: 'RND-1779', name: 'Repeat appointment' } as Task;

describe('resolveAgentChatOrigin', () => {
  it('binds a new session to the only task in context', () => {
    expect(resolveAgentChatOrigin([{ kind: 'task', task }], 'Sprint 34')).toEqual({
      chips: [{ key: 'task:RND-1779', mention: { id: 'RND-1779', kind: 'task', label: 'RND-1779' } }],
      context: { assigneeName: 'Nikita', sprintName: 'Sprint 34', summary: 'Repeat appointment', taskKey: 'RND-1779' },
      taskId: 'RND-1779',
    });
  });

  it('uses the tracker key for a QA card and the plain note text as the label', () => {
    const qa = { id: 'RND-1779-QA', name: 'QA', originalTaskId: 'RND-1779' } as Task;
    const origin = resolveAgentChatOrigin(
      [
        { kind: 'task', task: qa },
        { kind: 'note', noteId: 'n-1', text: 'Ревью с @[Толя](u-1)' },
      ],
      undefined
    );
    expect(origin.chips?.map((chip) => chip.mention)).toEqual([
      { id: 'RND-1779', kind: 'task', label: 'RND-1779' },
      { id: 'n-1', kind: 'note', label: 'Ревью с @Толя' },
    ]);
    expect(origin.taskId).toBe('RND-1779');
  });

  it('does not bind the session when several tasks or none are in context', () => {
    const other = { id: 'RND-1914', name: 'Discount' } as Task;
    const several = resolveAgentChatOrigin(
      [
        { kind: 'task', task },
        { kind: 'task', task: other },
      ],
      'S'
    );
    expect(several.context).toEqual({ sprintName: 'S' });
    expect(several.taskId).toBeUndefined();
    expect(resolveAgentChatOrigin([], 'S')).toEqual({ chips: [], context: { sprintName: 'S' } });
  });
});
