'use client';

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { UserOrganizationSummary } from '@/lib/organizations';
import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { issueTrackerProviderMessageKey } from '@/lib/issueTrackerProvider/issueTrackerUi';

import { AdminShellNavLinkItem } from './AdminShellNavLinkItem';

interface NavItem {
  href: string;
  icon: string;
  labelKey: string;
  requiresSuperAdmin?: boolean;
  requiresTracker?: boolean;
}

export interface AdminShellNavContext {
  activeOrg: UserOrganizationSummary | null | undefined;
  connectOrgId: string;
  exporterEnabled: boolean;
  isOrgAdminForActive: boolean;
  issueTrackerProviderKind: IssueTrackerProviderKind;
  isSuperAdmin: boolean;
  item: NavItem;
  pathname: string;
  trackerConnectionReady: boolean;
  trackerGateLoading: boolean;
  t: (key: string) => string;
}

export function isAdminNavItemVisible(ctx: AdminShellNavContext): boolean {
  if (ctx.item.requiresSuperAdmin) {
    return ctx.isSuperAdmin;
  }
  if (!ctx.exporterEnabled && ctx.item.href === '/admin/sync') return false;
  if (ctx.item.href === '/admin/tracker') {
    return Boolean(ctx.activeOrg);
  }
  if (!ctx.activeOrg?.canAccessAdmin) return false;
  if (!ctx.isOrgAdminForActive) return false;
  return true;
}

function isAdminNavTrackerLocked(ctx: AdminShellNavContext): boolean {
  return Boolean(
    ctx.item.requiresTracker &&
      ctx.connectOrgId &&
      (ctx.trackerGateLoading || !ctx.trackerConnectionReady)
  );
}

export function showAdminTrackerIncomplete(ctx: AdminShellNavContext): boolean {
  return (
    ctx.item.href === '/admin/tracker' &&
    Boolean(ctx.activeOrg) &&
    Boolean(ctx.connectOrgId) &&
    !ctx.trackerGateLoading &&
    !ctx.trackerConnectionReady
  );
}

function AdminShellLockedNavItem({ ctx }: { ctx: AdminShellNavContext }) {
  return (
    <li key={ctx.item.href}>
      <span
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border-l-2 border-transparent py-2.5 pl-2.5 pr-3 text-left text-sm font-medium text-gray-400 opacity-80 dark:text-gray-500"
        title={ctx.t(
          issueTrackerProviderMessageKey('admin.shell.trackerNavLockTitle', ctx.issueTrackerProviderKind)
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0 text-gray-400 dark:text-gray-500" name={ctx.item.icon} />
        <span className="flex-1 truncate">{ctx.t(ctx.item.labelKey)}</span>
        <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" name="lock" />
      </span>
    </li>
  );
}

export function renderAdminNavListEntry(
  ctx: AdminShellNavContext,
  onNavigate: () => void
): ReactNode {
  if (!isAdminNavItemVisible(ctx)) return null;
  if (isAdminNavTrackerLocked(ctx)) {
    return <AdminShellLockedNavItem key={ctx.item.href} ctx={ctx} />;
  }
  return (
    <AdminShellNavLinkItem
      key={ctx.item.href}
      ctx={ctx}
      onNavigate={onNavigate}
    />
  );
}
