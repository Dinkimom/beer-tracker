import type { AgentMentionCandidate } from './agentMentions';

import { describe, expect, it } from 'vitest';

import {
  AgentMentionsSchema,
  collectUsedAgentMentions,
  filterAgentMentionCandidates,
  insertAgentMention,
  mergeAgentMentions,
} from './agentMentions';

const candidates: AgentMentionCandidate[] = [
  { id: 'u-1', kind: 'person', label: 'Nikita Dmitriev' },
  { id: 'u-2', kind: 'person', label: 'Анна Петрова' },
  { hint: 'Repeat appointment', id: 'RND-1779', kind: 'task', label: 'RND-1779' },
  { hint: 'Discount percentage', id: 'RND-1914', kind: 'task', label: 'RND-1914' },
];

describe('filterAgentMentionCandidates', () => {
  it('returns everything for an empty query', () => {
    expect(filterAgentMentionCandidates(candidates, '')).toHaveLength(4);
  });

  it('ranks prefix over substring and searches task titles', () => {
    expect(filterAgentMentionCandidates(candidates, 'rnd-19').map((item) => item.id)).toEqual(['RND-1914']);
    expect(filterAgentMentionCandidates(candidates, 'анн').map((item) => item.id)).toEqual(['u-2']);
    expect(filterAgentMentionCandidates(candidates, 'appoint').map((item) => item.id)).toEqual(['RND-1779']);
    expect(filterAgentMentionCandidates(candidates, 'zzz')).toEqual([]);
  });
});

describe('insertAgentMention', () => {
  it('replaces the query at the caret with a plain @label and a space', () => {
    expect(insertAgentMention({ caret: 11, label: 'RND-1779', mentionStart: 7, text: 'Сдвинь @rnd' })).toEqual({
      nextCaret: 17,
      nextText: 'Сдвинь @RND-1779 ',
    });
  });

  it('keeps the text after the caret without doubling the space', () => {
    const result = insertAgentMention({ caret: 4, label: 'Анна Петрова', mentionStart: 0, text: '@анн на ревью' });
    expect(result.nextText).toBe('@Анна Петрова на ревью');
  });
});

describe('collectUsedAgentMentions / mergeAgentMentions', () => {
  const task = { id: 'RND-1779', kind: 'task' as const, label: 'RND-1779' };
  const person = { id: 'u-2', kind: 'person' as const, label: 'Анна Петрова' };

  it('drops mentions erased from the text and duplicates', () => {
    expect(collectUsedAgentMentions('Отдай @Анна Петрова', [task, person, person])).toEqual([person]);
  });

  it('puts the window context first without duplicates', () => {
    expect(mergeAgentMentions([task], [person, task])).toEqual([task, person]);
  });
});

describe('AgentMentionsSchema', () => {
  it('flattens labels and rejects empty ones', () => {
    expect(AgentMentionsSchema.parse([{ id: 'x', kind: 'note', label: '  Ревью\n с Аней ' }])).toEqual([
      { id: 'x', kind: 'note', label: 'Ревью с Аней' },
    ]);
    expect(AgentMentionsSchema.safeParse([{ id: 'x', kind: 'note', label: '   ' }]).success).toBe(false);
  });
});
