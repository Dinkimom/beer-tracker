import { z } from 'zod';

/**
 * Упоминания в просьбе агенту: «@RND-1779», «@Nikita Dmitriev». В тексте — обычное «@label»,
 * как в чате; рядом храним id, чтобы агент сразу получил taskId / assigneeId / id заметки.
 */
export type AgentMentionKind = 'note' | 'person' | 'task';

export interface AgentMention {
  id: string;
  kind: AgentMentionKind;
  label: string;
}

export interface AgentMentionCandidate extends AgentMention {
  /** Вторая строка в списке: название задачи, роль человека. */
  hint?: string;
}

const LABEL_MAX = 200;

export const AgentMentionsSchema = z
  .array(
    z.object({
      id: z.string().trim().min(1).max(255),
      kind: z.enum(['note', 'person', 'task']),
      label: z
        .string()
        .transform((value) => value.replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX))
        .pipe(z.string().min(1)),
    })
  )
  .max(30);

function agentMentionKey(mention: Pick<AgentMention, 'id' | 'kind'>): string {
  return `${mention.kind}:${mention.id}`;
}

function score(candidate: AgentMentionCandidate, query: string): number {
  const label = candidate.label.toLowerCase();
  if (label === query) {
    return 0;
  }
  if (label.startsWith(query)) {
    return 1;
  }
  if (label.includes(query)) {
    return 2;
  }
  return candidate.hint?.toLowerCase().includes(query) ? 3 : Number.POSITIVE_INFINITY;
}

/** Кандидаты под запрос после «@»: сначала точные и по началу, задачи — по ключу и по названию. */
export function filterAgentMentionCandidates(
  candidates: readonly AgentMentionCandidate[],
  rawQuery: string,
  limit = 8
): AgentMentionCandidate[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return candidates.slice(0, limit);
  }
  return candidates
    .map((candidate, index) => ({ candidate, index, rank: score(candidate, query) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.candidate);
}

/** Заменяет «@запрос» у курсора на «@label » и ставит курсор после пробела. */
export function insertAgentMention(input: {
  caret: number;
  label: string;
  mentionStart: number;
  text: string;
}): { nextCaret: number; nextText: string } {
  const before = input.text.slice(0, input.mentionStart);
  const after = input.text.slice(input.caret).replace(/^\S*/, '');
  const token = `@${input.label} `;
  const tail = after.startsWith(' ') ? after.slice(1) : after;
  return { nextCaret: before.length + token.length, nextText: `${before}${token}${tail}` };
}

/** Упоминания, которые остались в тексте (человек мог стереть «@…»), без дублей. */
export function collectUsedAgentMentions(
  text: string,
  mentions: readonly AgentMention[]
): AgentMention[] {
  const seen = new Set<string>();
  const used: AgentMention[] = [];
  for (const mention of mentions) {
    const key = agentMentionKey(mention);
    if (seen.has(key) || !text.includes(`@${mention.label}`)) {
      continue;
    }
    seen.add(key);
    used.push(mention);
  }
  return used;
}

/** Контекст, с которым открыли окно (задача, заметка), плюс упоминания из текста — без дублей. */
export function mergeAgentMentions(
  base: readonly AgentMention[],
  extra: readonly AgentMention[]
): AgentMention[] {
  const seen = new Set<string>();
  const merged: AgentMention[] = [];
  for (const mention of [...base, ...extra]) {
    const key = agentMentionKey(mention);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(mention);
    }
  }
  return merged;
}
