import type { AgentSession, AgentSessionMessage } from './agentSession';

import { describe, expect, it } from 'vitest';

import {
  AgentSessionUserMessageSchema,
  agentSessionDraftVersion,
  agentSessionTargetKey,
  agentSessionTitleFromIntent,
  buildAgentSessionAgentView,
  countOpenAgentSessionComments,
  draftSessionConflict,
  groupAgentSessionItemComments,
  parseAgentSessionReplies,
  pendingAgentSessionSkill,
  statusAfterUserMessage,
  summarizeAgentSessionForAgent,
  waitingForDraftSessionId,
} from './agentSession';

let seq = 0;
function message(overrides: Partial<AgentSessionMessage>): AgentSessionMessage {
  seq += 1;
  return {
    authorKind: 'user',
    authorName: 'Nikita',
    createdAt: `2026-10-20T10:00:${String(seq).padStart(2, '0')}.000Z`,
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    kind: 'message',
    mentions: [],
    options: [],
    proposalId: null,
    replyTo: null,
    resolution: null,
    skill: null,
    target: null,
    text: 'text',
    ...overrides,
  };
}

const target = { id: 'RND-1779', kind: 'position' as const, label: 'RND-1779 · перенос' };

function session(messages: AgentSessionMessage[]): AgentSession {
  return {
    closedAt: null,
    context: { taskKey: 'RND-1779' },
    createdAt: '2026-10-20T10:00:00.000Z',
    id: 'session-1',
    messages,
    origin: 'planner',
    ownerId: 'user-1',
    sprintId: 1221,
    status: 'waiting_agent',
    taskId: 'RND-1779',
    title: 'Разбей под ревью',
    updatedAt: '2026-10-20T10:05:00.000Z',
  };
}

describe('AgentSessionUserMessageSchema', () => {
  it('needs a target and text for a comment', () => {
    expect(AgentSessionUserMessageSchema.safeParse({ kind: 'comment', text: 'x' }).success).toBe(false);
    expect(AgentSessionUserMessageSchema.safeParse({ kind: 'comment', target, text: '' }).success).toBe(false);
    expect(AgentSessionUserMessageSchema.safeParse({ kind: 'comment', target, text: 'x' }).success).toBe(true);
  });

  it('takes a skill only with a message', () => {
    const skill = { id: 'sprint_risks', params: {} };
    expect(AgentSessionUserMessageSchema.parse({ kind: 'message', skill, text: 'Риски' }).skill).toEqual({
      id: 'sprint_risks',
      params: { detail: 'short' },
    });
    expect(AgentSessionUserMessageSchema.safeParse({ kind: 'redo', skill, text: '' }).success).toBe(false);
  });

  it('allows a redo without text', () => {
    expect(AgentSessionUserMessageSchema.safeParse({ kind: 'redo', text: '' }).success).toBe(true);
    expect(AgentSessionUserMessageSchema.safeParse({ kind: 'message', text: '' }).success).toBe(false);
  });
});

describe('statusAfterUserMessage', () => {
  it('hands the session to the agent on redo and messages, keeps it on comments', () => {
    expect(statusAfterUserMessage('redo', 'waiting_user')).toBe('waiting_agent');
    expect(statusAfterUserMessage('message', 'closed')).toBe('waiting_agent');
    expect(statusAfterUserMessage('comment', 'waiting_user')).toBe('waiting_user');
    expect(statusAfterUserMessage('comment', 'closed')).toBe('waiting_user');
  });
});

describe('item comments', () => {
  it('pairs comments with agent replies and counts open ones', () => {
    const answered = message({ kind: 'comment', target, text: 'Отдай Ане' });
    const open = message({ kind: 'comment', target, text: 'И после демо' });
    const reply = message({
      authorKind: 'agent',
      kind: 'reply',
      replyTo: answered.id,
      resolution: 'addressed',
      target,
      text: 'Отдал Ане',
    });
    const messages = [answered, open, reply];
    const items = groupAgentSessionItemComments(messages).get(agentSessionTargetKey('position', 'RND-1779'));
    expect(items?.map((item) => [item.comment.id, item.open, item.replies.length])).toEqual([
      [answered.id, false, 1],
      [open.id, true, 0],
    ]);
    expect(countOpenAgentSessionComments(messages)).toBe(1);
  });
});

describe('agent views', () => {
  it('lists open comments and the call to start with', () => {
    const request = message({ kind: 'request', text: 'Разбей под ревью' });
    const draft = message({ authorKind: 'agent', kind: 'draft', proposalId: 'abc', text: 'v1' });
    const comment = message({ kind: 'comment', target, text: 'После демо' });
    const view = buildAgentSessionAgentView(session([request, draft, comment]));
    expect(view.openComments).toEqual([comment.id]);
    expect(view.draftVersion).toBe(1);
    expect(view.fetchContext).toBe('get_sprint_context(sprintId: 1221, taskIds: ["RND-1779"])');
    expect(view.conversation.map((item) => [item.from, item.kind])).toEqual([
      ['user', 'request'],
      ['agent', 'draft'],
      ['user', 'comment'],
    ]);
    expect(view.conversation[2]?.target).toEqual(target);
  });

  it('passes the skill instructions and answer options to the agent', () => {
    const request = message({
      kind: 'request',
      skill: { id: 'balance_load', params: { reassign: 'no' } },
      text: 'Выровнять загрузку',
    });
    const question = message({ authorKind: 'agent', options: ['Отдать Маше', 'Сдвинуть'], text: 'Как быть?' });
    const view = buildAgentSessionAgentView(session([request, question]));
    expect(view.conversation[0]?.skill).toMatchObject({ id: 'balance_load', output: 'draft' });
    expect(view.conversation[0]?.skill?.instructions).toContain('only shift tasks in time');
    expect(view.conversation[1]?.options).toEqual(['Отдать Маше', 'Сдвинуть']);
    // Агент уже ответил на скилл — наверху его нет.
    expect(view.skill).toBeUndefined();
  });

  it('puts a skill invoked mid-session on top until the agent answers', () => {
    const risks = message({ kind: 'message', skill: { id: 'sprint_risks', params: { detail: 'short' } }, text: 'Риски' });
    const messages = [message({ kind: 'request' }), message({ authorKind: 'agent', kind: 'draft' }), risks];
    expect(pendingAgentSessionSkill(messages)).toEqual(risks.skill);
    expect(pendingAgentSessionSkill([...messages, message({ kind: 'message', text: 'и ещё' })])).toEqual(risks.skill);
    expect(pendingAgentSessionSkill([...messages, message({ authorKind: 'agent' })])).toBeNull();
    expect(summarizeAgentSessionForAgent(session(messages)).skill).toBe('sprint_risks');
  });

  it('summarizes a session for the inbox', () => {
    const summary = summarizeAgentSessionForAgent(session([message({ kind: 'request', text: 'Разбей' })]));
    expect(summary).toMatchObject({ draftVersion: 0, lastMessage: 'Разбей', openComments: 0, status: 'waiting_agent' });
  });

  it('counts draft versions', () => {
    expect(
      agentSessionDraftVersion([message({ kind: 'draft' }), message({ kind: 'reply' }), message({ kind: 'draft' })])
    ).toBe(2);
  });
});

describe('parseAgentSessionReplies', () => {
  it('accepts nothing and rejects empty answers', () => {
    expect(parseAgentSessionReplies(undefined)).toEqual([]);
    expect(() =>
      parseAgentSessionReplies([
        { messageId: '00000000-0000-4000-8000-000000000001', resolution: 'addressed', text: '' },
      ])
    ).toThrow(/validation_failed/);
  });
});

describe('agentSessionTitleFromIntent', () => {
  it('prefers the intent and flattens it', () => {
    expect(agentSessionTitleFromIntent('  Разложи\n бэклог ', 'fallback')).toBe('Разложи бэклог');
    expect(agentSessionTitleFromIntent(undefined, 'upsertPosition RND-1')).toBe('upsertPosition RND-1');
  });
});

describe('one draft per session', () => {
  it('blocks a draft from another session while one is on the board', () => {
    expect(draftSessionConflict({ draftSessionId: null, requestedSessionId: 'b' })).toBeNull();
    expect(draftSessionConflict({ draftSessionId: 'a', requestedSessionId: 'a' })).toBeNull();
    expect(draftSessionConflict({ draftSessionId: 'a', requestedSessionId: 'b' })).toMatch(
      /^draft_belongs_to_other_session: .*session a/
    );
  });

  it('marks inbox sessions queued behind the draft session of their sprint', () => {
    const bySprint = new Map([[1221, 'a']]);
    expect(waitingForDraftSessionId({ id: 'b', sprintId: 1221 }, bySprint)).toBe('a');
    expect(waitingForDraftSessionId({ id: 'a', sprintId: 1221 }, bySprint)).toBeNull();
    expect(waitingForDraftSessionId({ id: 'c', sprintId: 7 }, bySprint)).toBeNull();
  });
});
