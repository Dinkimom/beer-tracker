import type { BoardListItem } from '@/lib/api/types';

import { describe, expect, it } from 'vitest';

import { boardSelectorLabel } from './boardSelectorLabel';

function row(partial: Partial<BoardListItem> & Pick<BoardListItem, 'id' | 'name' | 'queue' | 'team'>): BoardListItem {
  return {
    teamTitle: '',
    ...partial,
  };
}

describe('boardSelectorLabel', () => {
  it('prefers team title over tracker board name', () => {
    expect(
      boardSelectorLabel(
        row({
          id: 1,
          name: '👀 Boobing',
          queue: 'Q',
          team: 'booking',
          teamTitle: 'Booking Team',
        })
      )
    ).toBe('Booking Team');
  });

  it('falls back to board name when team title empty', () => {
    expect(
      boardSelectorLabel(
        row({
          id: 1,
          name: 'Only Board',
          queue: 'Q',
          team: 'slug',
          teamTitle: '  ',
        })
      )
    ).toBe('Only Board');
  });
});
