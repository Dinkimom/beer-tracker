'use client';

import type { ReactNode } from 'react';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';

export function AdminShellMobileDrawer({
  children,
  closeMenuAria,
  closeMenuTitle,
  mobileMenuTitle,
  onClose,
}: {
  children: ReactNode;
  closeMenuAria: string;
  closeMenuTitle: string;
  mobileMenuTitle: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 cursor-pointer bg-black/50"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-ds-border-subtle bg-white dark:bg-gray-800">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-ds-border-subtle px-4 py-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{mobileMenuTitle}</span>
          <HeaderIconButton
            aria-label={closeMenuAria}
            title={closeMenuTitle}
            type="button"
            onClick={onClose}
          >
            <Icon className="h-5 w-5" name="x" />
          </HeaderIconButton>
        </div>
        {children}
      </aside>
    </div>
  );
}
