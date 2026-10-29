import type { AgentSession } from './agentSession';

import { describe, expect, it } from 'vitest';

import { agentDevState, agentDevTasks } from './agentDevState';

function session(overrides: Partial<AgentSession>): AgentSession {
  return {
    agentActivity: null,
    closedAt: null,
    context: {},
    createdAt: '2026-10-30T00:00:00.000Z',
    id: 's1',
    kind: 'dev',
    messages: [],
    origin: 'planner',
    ownerId: 'u1',
    sprintId: 1,
    status: 'waiting_agent',
    taskId: 'RND-1',
    title: 'RND-1',
    updatedAt: '2026-10-30T00:00:00.000Z',
    ...overrides,
  };
}

const result = { kind: 'result' } as AgentSession['messages'][number];
const reply = { kind: 'message' } as AgentSession['messages'][number];

describe('agentDevState', () => {
  it('tells where the work is', () => {
    expect(agentDevState(session({}), true)).toBe('working');
    expect(agentDevState(session({}), false)).toBe('waitingAgent');
    expect(agentDevState(session({ messages: [result], status: 'waiting_user' }), false)).toBe('review');
    expect(agentDevState(session({ messages: [result, reply], status: 'waiting_user' }), false)).toBe('waitingUser');
    expect(agentDevState(session({ status: 'closed' }), true)).toBe('closed');
  });

  it('maps tasks to their latest open development session, skipping plans and closed ones', () => {
    const tasks = agentDevTasks(
      [
        session({ id: 'old', updatedAt: '2026-10-30T01:00:00.000Z' }),
        session({ id: 'new', updatedAt: '2026-10-30T02:00:00.000Z' }),
        session({ id: 'plan', kind: 'plan', taskId: 'RND-2' }),
        session({ id: 'done', status: 'closed', taskId: 'RND-3' }),
      ],
      new Set(['new'])
    );
    expect([...tasks]).toEqual([['RND-1', { sessionId: 'new', state: 'working' }]]);
  });
});
