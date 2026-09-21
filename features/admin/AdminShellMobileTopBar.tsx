'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';

export function AdminShellMobileTopBar({
  openMenuAria,
  openMenuTitle,
  sectionTitle,
  onOpenMenu,
}: {
  onOpenMenu: () => void;
  openMenuAria: string;
  openMenuTitle: string;
  sectionTitle: string;
}) {
  return (
    <div className="flex flex-shrink-0 items-center gap-3 border-b border-ds-border-subtle bg-ds-surface-header px-4 py-3 md:hidden">
      <HeaderIconButton
        aria-label={openMenuAria}
        title={openMenuTitle}
        type="button"
        onClick={onOpenMenu}
      >
        <Icon className="h-5 w-5" name="menu" />
      </HeaderIconButton>
      <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {sectionTitle}
      </span>
    </div>
  );
}
