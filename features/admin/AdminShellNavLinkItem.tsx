'use client';

import type { AdminShellNavContext } from './AdminShellNavHelpers';

import Link from 'next/link';

import { Icon } from '@/components/Icon';
import { issueTrackerProviderMessageKey } from '@/lib/issueTrackerProvider/issueTrackerUi';

import { showAdminTrackerIncomplete } from './AdminShellNavHelpers';

function navAlertIconTone(trackerIncompleteActive: boolean): string {
  return trackerIncompleteActive
    ? 'text-amber-800 dark:text-amber-200'
    : 'text-amber-600 dark:text-amber-400';
}

function navLinkSurface(isActive: boolean, trackerIncompleteActive: boolean): string {
  if (trackerIncompleteActive) {
    return 'bg-amber-50 text-amber-950 focus-visible:ring-amber-500 dark:bg-amber-400/10 dark:text-amber-50';
  }
  if (isActive) {
    return 'bg-gray-900/[0.06] text-gray-900 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white';
  }
  return 'text-gray-600 hover:bg-gray-900/[0.04] hover:text-gray-900 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-100';
}

function navLeadIconTone(isActive: boolean, trackerIncompleteActive: boolean): string {
  if (trackerIncompleteActive) return 'text-amber-700 dark:text-amber-300';
  if (isActive) return 'text-gray-900 dark:text-white';
  return 'text-gray-400 dark:text-gray-500';
}

export function AdminShellNavLinkItem({
  ctx,
  onNavigate,
}: {
  ctx: AdminShellNavContext;
  onNavigate: () => void;
}) {
  const isActive = ctx.pathname.startsWith(ctx.item.href);
  const trackerIncomplete = showAdminTrackerIncomplete(ctx);
  const trackerIncompleteActive = isActive && trackerIncomplete;

  return (
    <li key={ctx.item.href}>
      <Link
        aria-current={isActive ? 'page' : undefined}
        aria-label={
          trackerIncomplete
            ? ctx.t(
                issueTrackerProviderMessageKey(
                  'admin.shell.trackerIncompleteAria',
                  ctx.issueTrackerProviderKind
                )
              )
            : undefined
        }
        className={[
          'flex w-full cursor-pointer items-center gap-3 rounded-xl py-2 pl-2.5 pr-3 text-left text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2',
          navLinkSurface(isActive, trackerIncompleteActive),
        ].join(' ')}
        href={ctx.item.href}
        title={
          trackerIncomplete
            ? ctx.t(
                issueTrackerProviderMessageKey(
                  'admin.shell.trackerIncompleteTitle',
                  ctx.issueTrackerProviderKind
                )
              )
            : undefined
        }
        onClick={onNavigate}
      >
        <Icon
          className={['h-[18px] w-[18px] shrink-0', navLeadIconTone(isActive, trackerIncompleteActive)].join(' ')}
          name={ctx.item.icon}
        />
        <span className="min-w-0 flex-1 truncate">{ctx.t(ctx.item.labelKey)}</span>
        {trackerIncomplete ? (
          <span aria-hidden className="inline-flex shrink-0">
            <Icon className={['h-4 w-4', navAlertIconTone(trackerIncompleteActive)].join(' ')} name="alert-triangle" />
          </span>
        ) : null}
      </Link>
    </li>
  );
}
