'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';
import type { AdminTeamRow } from '@/features/admin/adminTeamCatalog';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { badgeMuted, label, muted } from '@/features/admin/adminUiTokens';

interface AdminTeamSettingsBindingFieldsProps {
  boardOptions: CustomSelectOption<string>[];
  boardSearchLoading: boolean;
  catalogLoading: boolean;
  editBoard: string;
  editQueue: string;
  initialTeam: AdminTeamRow;
  isOrgAdmin: boolean;
  queueOptions: CustomSelectOption<string>[];
  onBoardSearchQueryChange: (query: string) => void;
  setEditBoard: (v: string) => void;
  setEditQueue: (v: string) => void;
}

export function AdminTeamSettingsBindingFields({
  boardOptions,
  boardSearchLoading,
  catalogLoading,
  editBoard,
  editQueue,
  initialTeam,
  isOrgAdmin,
  queueOptions,
  onBoardSearchQueryChange,
  setEditBoard,
  setEditQueue,
}: AdminTeamSettingsBindingFieldsProps) {
  const { t } = useI18n();

  if (isOrgAdmin) {
    return (
      <>
        <div>
          <span className={label} id="team-edit-queue-label">
            {t('admin.teamSettings.queueLabel')}
          </span>
          {catalogLoading ? (
            <div aria-labelledby="team-edit-queue-label" className="space-y-1.5" role="status">
              <span className="sr-only">{t('admin.teamSettings.queuesLoadingSr')}</span>
              <div className="h-9 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-600" />
            </div>
          ) : (
            <CustomSelect
              className="w-full"
              options={queueOptions}
              searchPlaceholder={t('admin.teamSettings.queueSearch')}
              searchable
              selectedPrefix=""
              title={t('admin.teamSettings.queueTitle')}
              value={editQueue}
              onChange={setEditQueue}
            />
          )}
        </div>
        <div>
          <span className={label} id="team-edit-board-label">
            {t('admin.teamSettings.boardLabel')}
          </span>
          {catalogLoading ? (
            <div aria-labelledby="team-edit-board-label" className="space-y-1.5" role="status">
              <span className="sr-only">{t('admin.teamSettings.boardsLoadingSr')}</span>
              <div className="h-9 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-600" />
            </div>
          ) : (
            <CustomSelect
              className="w-full"
              isSearchLoading={boardSearchLoading}
              options={boardOptions}
              searchLoadingMessage={t('admin.teamsPage.catalogLoading')}
              searchPlaceholder={t('admin.teamSettings.boardSearch')}
              searchable
              selectedPrefix=""
              title={t('admin.teamSettings.boardTitle')}
              value={editBoard}
              onChange={setEditBoard}
              onSearchQueryChange={onBoardSearchQueryChange}
            />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <p className={`text-sm ${muted}`}>{t('admin.teamSettings.orgAdminOnlyBinding')}</p>
      <p className={badgeMuted}>
        <span className="font-normal opacity-90">{t('admin.teamSettings.labelQueue')}</span>
        <span className="font-mono">{initialTeam.tracker_queue_key}</span>
      </p>
      <p className={badgeMuted}>
        <span className="font-normal opacity-90">{t('admin.teamSettings.labelBoardId')}</span>
        <span className="font-mono">{initialTeam.tracker_board_id}</span>
      </p>
    </div>
  );
}
