import type { QuickAddIssueSearchResult } from './types';
import type { Task } from '@/types';

interface HighlightedTextPart {
  match: boolean;
  text: string;
}

export function isClosedQuickAddIssue(task: Task): boolean {
  return (task.originalStatus ?? '').trim().toLowerCase() === 'closed';
}

export function filterAndSortQuickAddIssueResults(
  results: readonly QuickAddIssueSearchResult[],
  excludedIssueKeys: ReadonlySet<string>
): QuickAddIssueSearchResult[] {
  const visible = results.filter((item) => !excludedIssueKeys.has(item.key));
  return visible.sort((left, right) => {
    const leftClosed = isClosedQuickAddIssue(left.task) ? 1 : 0;
    const rightClosed = isClosedQuickAddIssue(right.task) ? 1 : 0;
    return leftClosed - rightClosed;
  });
}

export function splitHighlightedText(text: string, query: string): HighlightedTextPart[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [{ match: false, text }];
  }
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const chunks = text.split(new RegExp(`(${escaped})`, 'gi'));
  return chunks
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => ({
      match: chunk.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      text: chunk,
    }));
}

export function quickAddSearchOptionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}
