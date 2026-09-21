import type { QuickAddIssueSearchResult } from './types';
import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  filterAndSortQuickAddIssueResults,
  isClosedQuickAddIssue,
  quickAddSearchOptionId,
  splitHighlightedText,
} from './quickAddMenuIssueSearch';

function result(
  key: string,
  originalStatus?: string
): QuickAddIssueSearchResult {
  return {
    key,
    summary: key,
    task: { id: key, name: key, originalStatus } as Task,
  };
}

describe('isClosedQuickAddIssue', () => {
  it('treats tracker closed status as closed', () => {
    expect(isClosedQuickAddIssue({ originalStatus: 'Closed' } as Task)).toBe(true);
    expect(isClosedQuickAddIssue({ originalStatus: 'inProgress' } as Task)).toBe(false);
    expect(isClosedQuickAddIssue({} as Task)).toBe(false);
  });
});

describe('filterAndSortQuickAddIssueResults', () => {
  it('drops issues already on the board and keeps open issues first', () => {
    const sorted = filterAndSortQuickAddIssueResults(
      [
        result('A-1', 'closed'),
        result('A-2', 'open'),
        result('A-3', 'closed'),
        result('A-4', 'inProgress'),
      ],
      new Set(['A-4'])
    );
    expect(sorted.map((item) => item.key)).toEqual(['A-2', 'A-1', 'A-3']);
  });
});

describe('splitHighlightedText', () => {
  it('returns the original string when the query is empty', () => {
    expect(splitHighlightedText('DEV-987 Test', '  ')).toEqual([
      { match: false, text: 'DEV-987 Test' },
    ]);
  });

  it('marks case-insensitive matches and keeps surrounding text', () => {
    expect(splitHighlightedText('Тест открытия сайдера', 'тест')).toEqual([
      { match: true, text: 'Тест' },
      { match: false, text: ' открытия сайдера' },
    ]);
  });

  it('escapes regex characters in the query', () => {
    expect(splitHighlightedText('cost (test)', '(test)')).toEqual([
      { match: false, text: 'cost ' },
      { match: true, text: '(test)' },
    ]);
  });
});

describe('quickAddSearchOptionId', () => {
  it('builds a stable option id', () => {
    expect(quickAddSearchOptionId('list', 2)).toBe('list-option-2');
  });
});
