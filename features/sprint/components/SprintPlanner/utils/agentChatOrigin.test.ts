import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { resolveAgentChatOrigin } from './agentChatOrigin';

describe('resolveAgentChatOrigin', () => {
  it('pins the task as context and binds a new session to it', () => {
    const task = { assigneeName: 'Nikita', id: 'RND-1779', name: 'Repeat appointment' } as Task;
    const { key, origin } = resolveAgentChatOrigin({ kind: 'task', task }, 'Sprint 34');
    expect(key).toBe('task:RND-1779');
    expect(origin).toEqual({
      context: { assigneeName: 'Nikita', sprintName: 'Sprint 34', summary: 'Repeat appointment', taskKey: 'RND-1779' },
      mentions: [{ id: 'RND-1779', kind: 'task', label: 'RND-1779' }],
      taskId: 'RND-1779',
    });
  });

  it('uses the plain note text as the context label', () => {
    const { origin } = resolveAgentChatOrigin(
      { kind: 'note', noteId: 'n-1', text: 'Ревью с @[Толя](u-1)' },
      undefined
    );
    expect(origin.mentions).toEqual([{ id: 'n-1', kind: 'note', label: 'Ревью с @Толя' }]);
  });

  it('opens the sprint and the current session without pinned context', () => {
    expect(resolveAgentChatOrigin({ kind: 'sprint' }, 'S').origin).toEqual({ context: { sprintName: 'S' } });
    expect(resolveAgentChatOrigin({ kind: 'session' }, 'S').key).toBe('session');
  });
});
