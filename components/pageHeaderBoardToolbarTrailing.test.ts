import { describe, expect, it } from 'vitest';

import {
  type PageHeaderBoardToolbarTrailingSlot,
  pageHeaderBoardToolbarTrailingSlots,
} from './pageHeaderBoardToolbarTrailing';

function hasAdjacentDividers(slots: PageHeaderBoardToolbarTrailingSlot[]): boolean {
  return slots.some((slot, index) => {
    if (!slot.endsWith('-divider')) {
      return false;
    }
    return slots[index + 1]?.endsWith('-divider') === true;
  });
}

describe('pageHeaderBoardToolbarTrailingSlots', () => {
  it('keeps a single divider when the user is not an admin', () => {
    const slots = pageHeaderBoardToolbarTrailingSlots({
      hasAdminLink: false,
      showUserCluster: true,
    });

    expect(slots).toEqual(['user-divider', 'user']);
    expect(hasAdjacentDividers(slots)).toBe(false);
  });

  it('places the admin link between two dividers', () => {
    const slots = pageHeaderBoardToolbarTrailingSlots({
      hasAdminLink: true,
      showUserCluster: true,
    });

    expect(slots).toEqual(['admin-divider', 'admin', 'user-divider', 'user']);
    expect(hasAdjacentDividers(slots)).toBe(false);
  });

  it('does not render a leftover divider in demo without admin', () => {
    const slots = pageHeaderBoardToolbarTrailingSlots({
      hasAdminLink: false,
      showUserCluster: false,
    });

    expect(slots).toEqual([]);
    expect(hasAdjacentDividers(slots)).toBe(false);
  });
});
