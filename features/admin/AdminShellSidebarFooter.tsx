'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';

export function AdminShellSidebarFooter({
  email,
  roleLine,
  logoutAria,
  logoutTitle,
  onLogout,
}: {
  email: string;
  logoutAria: string;
  logoutTitle: string;
  onLogout: () => void;
  roleLine: string | null;
}) {
  return (
    <div className="border-t border-ds-border-subtle px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{email}</p>
          {roleLine ? (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{roleLine}</p>
          ) : null}
        </div>
        <HeaderIconButton
          aria-label={logoutAria}
          title={logoutTitle}
          type="button"
          onClick={onLogout}
        >
          <Icon className="h-4 w-4" name="log-out" />
        </HeaderIconButton>
      </div>
    </div>
  );
}
