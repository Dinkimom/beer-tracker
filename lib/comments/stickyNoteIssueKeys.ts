import { mergeAdjacentTextSegments } from '@/lib/comments/stickyNoteTextSegments';

/** Ключи вида PROJ-12 / BT-W2-4 (Yandex и Jira). */
const ISSUE_KEY_BODY = '[A-Za-z][A-Za-z0-9]*-(?:[A-Za-z0-9]+-)*\\d+';
const ISSUE_KEY_FULL_RE = new RegExp(`^${ISSUE_KEY_BODY}$`);
/** Голый ключ в тексте, не внутри слова/идентификатора. */
const ISSUE_KEY_IN_TEXT_RE = new RegExp(`(?<![A-Za-z0-9])(${ISSUE_KEY_BODY})(?![A-Za-z0-9])`, 'g');

type StickyNoteIssueKeySegment =
  | { key: string; type: 'issueKey' }
  | { type: 'text'; value: string };

export function isStickyNoteIssueKey(value: string): boolean {
  return ISSUE_KEY_FULL_RE.test(value);
}

export function splitStickyNoteTextByIssueKeys(text: string): StickyNoteIssueKeySegment[] {
  const segments: StickyNoteIssueKeySegment[] = [];
  let lastIndex = 0;
  ISSUE_KEY_IN_TEXT_RE.lastIndex = 0;
  let match = ISSUE_KEY_IN_TEXT_RE.exec(text);
  while (match) {
    const start = match.index;
    const key = match[1] ?? '';
    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    if (key) {
      segments.push({ key, type: 'issueKey' });
    }
    lastIndex = start + match[0].length;
    match = ISSUE_KEY_IN_TEXT_RE.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return mergeAdjacentTextSegments(segments);
}
