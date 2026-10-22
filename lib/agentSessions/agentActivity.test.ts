import type { AgentSessionMessage } from './agentSession';

import { describe, expect, it } from 'vitest';

import { AGENT_ACTIVITY_FRESH_MS, agentMcpToolCallsFromBody, agentWaitState } from './agentActivity';

const SESSION_ID = '0b7b7a52-3f0e-4c55-9a52-8f7d2a1c9e10';

function userMessage(createdAt: string): AgentSessionMessage {
  return {
    authorKind: 'user',
    authorName: null,
    createdAt,
    id: createdAt,
    kind: 'request',
    mentions: [],
    options: [],
    proposalId: null,
    replyTo: null,
    resolution: null,
    skill: null,
    target: null,
    text: 'Разложи бэклог',
  };
}

describe('agentMcpToolCallsFromBody', () => {
  it('reads tool calls with sprint and session from single and batch bodies', () => {
    expect(
      agentMcpToolCallsFromBody({
        id: 1,
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { arguments: { sprintId: 1221 }, name: 'get_sprint_context' },
      })
    ).toEqual([{ sessionId: null, sprintId: 1221, step: 'studying' }]);
    expect(
      agentMcpToolCallsFromBody([
        { method: 'initialize', params: {} },
        { method: 'tools/call', params: { arguments: { sessionId: SESSION_ID }, name: 'reply_agent_session' } },
      ])
    ).toEqual([{ sessionId: SESSION_ID, sprintId: null, step: 'replying' }]);
  });

  it('ignores non-call messages and junk arguments', () => {
    expect(agentMcpToolCallsFromBody({ method: 'tools/list' })).toEqual([]);
    expect(agentMcpToolCallsFromBody(null)).toEqual([]);
    expect(
      agentMcpToolCallsFromBody({
        method: 'tools/call',
        params: { arguments: { sessionId: 'nope', sprintId: '12' }, name: 'whoami' },
      })
    ).toEqual([{ sessionId: null, sprintId: null, step: 'reading' }]);
  });
});

describe('agentWaitState', () => {
  const asked = '2026-10-23T10:00:00.000Z';
  const askedAt = Date.parse(asked);

  it('is unseen until the agent calls MCP after the last user message', () => {
    expect(agentWaitState({ agentActivity: null, messages: [userMessage(asked)] }, askedAt)).toEqual({
      kind: 'unseen',
    });
    const before = { at: '2026-10-23T09:59:00.000Z', step: 'replying' as const };
    expect(agentWaitState({ agentActivity: before, messages: [userMessage(asked)] }, askedAt).kind).toBe('unseen');
  });

  it('is working while calls are fresh and silent after that', () => {
    const activity = { at: '2026-10-23T10:01:00.000Z', step: 'studying' as const };
    const session = { agentActivity: activity, messages: [userMessage(asked)] };
    expect(agentWaitState(session, askedAt + 90_000)).toEqual({ kind: 'working', since: askedAt, step: 'studying' });
    expect(agentWaitState(session, Date.parse(activity.at) + AGENT_ACTIVITY_FRESH_MS + 1)).toEqual({
      kind: 'silent',
      step: 'studying',
    });
  });
});
