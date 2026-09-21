export type PageHeaderBoardToolbarTrailingSlot =
  | 'admin-divider'
  | 'admin'
  | 'user-divider'
  | 'user';

export function pageHeaderBoardToolbarTrailingSlots(input: {
  hasAdminLink: boolean;
  showUserCluster: boolean;
}): PageHeaderBoardToolbarTrailingSlot[] {
  const slots: PageHeaderBoardToolbarTrailingSlot[] = [];
  if (input.hasAdminLink) {
    slots.push('admin-divider', 'admin');
  }
  if (input.showUserCluster) {
    slots.push('user-divider', 'user');
  }
  return slots;
}
