import type { Developer } from '@/types';

interface StickyNoteMentionSegment {
  id: string;
  name: string;
  type: 'mention';
}

type StickyNoteTextWithMentionSegment =
  | StickyNoteMentionSegment
  | { type: 'text'; value: string };

const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

export function formatStickyNoteMentionToken(developer: Pick<Developer, 'id' | 'name'>): string {
  const safeName = developer.name.trim().replace(/]/g, '›') || developer.id;
  const safeId = developer.id.trim().replace(/[()]/g, '');
  return `@[${safeName}](${safeId})`;
}

export function parseStickyNoteMentionAssigneeIds(text: string): string[] {
  const ids = splitStickyNoteTextByMentions(text)
    .filter((segment): segment is StickyNoteMentionSegment => segment.type === 'mention')
    .map((segment) => segment.id.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

export function diffNewStickyNoteMentionAssigneeIds(previousText: string, nextText: string): string[] {
  const previousIds = new Set(parseStickyNoteMentionAssigneeIds(previousText));
  return parseStickyNoteMentionAssigneeIds(nextText).filter((id) => !previousIds.has(id));
}

export function formatStickyNoteTextForPreview(text: string, maxLength = 120): string {
  const plain = text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength - 1)}…`;
}

export function getMentionQueryAtCaret(
  text: string,
  caret: number
): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const atIndex = before.lastIndexOf('@');
  if (atIndex === -1) {
    return null;
  }
  if (atIndex > 0 && !/\s/.test(before.charAt(atIndex - 1))) {
    return null;
  }
  const query = before.slice(atIndex + 1);
  if (/[\s[\]()\\]/.test(query)) {
    return null;
  }
  return { start: atIndex, query };
}

export function filterMentionCandidates(
  developers: readonly Developer[],
  query: string
): Developer[] {
  const normalizedQuery = query.trim().toLowerCase();
  const eligible = developers.filter((developer) => developer.name.trim().length > 0);
  if (!normalizedQuery) {
    return [...eligible].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }
  return eligible
    .filter((developer) => developer.name.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
}

export function insertStickyNoteMentionToken(input: {
  caret: number;
  developer: Pick<Developer, 'id' | 'name'>;
  mentionStart: number;
  text: string;
}): { nextCaret: number; nextText: string } {
  const token = formatStickyNoteMentionToken(input.developer);
  const before = input.text.slice(0, input.mentionStart);
  const after = input.text.slice(input.caret);
  const nextText = `${before}${token} ${after}`;
  return {
    nextText,
    nextCaret: before.length + token.length + 1,
  };
}

export function splitStickyNoteTextByMentions(text: string): StickyNoteTextWithMentionSegment[] {
  const segments: StickyNoteTextWithMentionSegment[] = [];
  let lastIndex = 0;
  MENTION_TOKEN_RE.lastIndex = 0;
  let match = MENTION_TOKEN_RE.exec(text);
  while (match) {
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    segments.push({
      type: 'mention',
      name: match[1] ?? '',
      id: match[2] ?? '',
    });
    lastIndex = start + match[0].length;
    match = MENTION_TOKEN_RE.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return mergeAdjacentStickyNoteMentionTextSegments(segments);
}

function mergeAdjacentStickyNoteMentionTextSegments(
  segments: StickyNoteTextWithMentionSegment[]
): StickyNoteTextWithMentionSegment[] {
  const merged: StickyNoteTextWithMentionSegment[] = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (segment.type === 'text' && previous?.type === 'text') {
      previous.value += segment.value;
      continue;
    }
    merged.push(segment);
  }
  return merged;
}
