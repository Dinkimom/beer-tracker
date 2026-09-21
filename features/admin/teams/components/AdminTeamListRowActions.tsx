'use client';

import type { AdminTeamRow } from '@/features/admin/adminTeamCatalog';

import Link from 'next/link';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

interface AdminTeamListRowActionsProps {
  activeTooltip: string;
  busy: boolean;
  detailHref: string;
  editLabel: string;
  showRemoveTeam: boolean;
  team: AdminTeamRow;
  onRemove: () => void;
  onToggleActive: (next: boolean) => void;
}

export function AdminTeamListRowActions({
  activeTooltip,
  busy,
  detailHref,
  editLabel,
  onRemove,
  onToggleActive,
  showRemoveTeam,
  team,
}: AdminTeamListRowActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">
      <Link
        aria-label={editLabel}
        className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        href={detailHref}
        title={editLabel}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" name="edit" />
        {t('admin.teamRow.edit')}
      </Link>
      <div className="flex items-center gap-2" title={activeTooltip}>
        <span className="hidden text-xs text-gray-500 sm:inline dark:text-gray-400">
          {team.active ? t('admin.teamRow.enabled') : t('admin.teamRow.disabled')}
        </span>
        <button
          aria-checked={team.active}
          aria-label={
            (team.active ? t('admin.teamRow.enabledAriaPrefix') : t('admin.teamRow.disabledAriaPrefix')) +
            activeTooltip
          }
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
            team.active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
          } disabled:cursor-not-allowed disabled:opacity-50`}
          disabled={busy}
          role="switch"
          title={activeTooltip}
          type="button"
          onClick={() => onToggleActive(!team.active)}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full border border-gray-200 bg-white transition-transform duration-200 dark:border-gray-500 ${
              team.active ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {showRemoveTeam ? (
        <Button
          className="px-3 py-1.5 text-xs"
          disabled={busy}
          type="button"
          variant="dangerOutline"
          onClick={onRemove}
        >
          {t('admin.teamRow.delete')}
        </Button>
      ) : null}
    </div>
  );
}
