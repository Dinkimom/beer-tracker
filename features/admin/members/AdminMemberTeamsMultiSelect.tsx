'use client';

import { useMemo } from 'react';

import { SearchableMultiSelect } from '@/components/SearchableMultiSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { label, muted } from '@/features/admin/adminUiTokens';

export interface AdminMemberTeamOption {
  id: string;
  title: string;
}

interface AdminMemberTeamsMultiSelectProps {
  disabled?: boolean;
  options: AdminMemberTeamOption[];
  selectedIds: string[];
  onChange: (teamIds: string[]) => void;
}

function toggleTeamId(selectedIds: string[], teamId: string): string[] {
  if (selectedIds.includes(teamId)) {
    return selectedIds.filter((id) => id !== teamId);
  }
  return [...selectedIds, teamId];
}

function teamsMultiSelectDisplayText(
  options: AdminMemberTeamOption[],
  selectedIds: string[],
  emptyLabel: string,
  selectedCountLabel: (count: number) => string
): string {
  if (selectedIds.length === 0) {
    return emptyLabel;
  }
  const titles = selectedIds
    .map((id) => options.find((option) => option.id === id)?.title)
    .filter((title): title is string => Boolean(title));
  if (titles.length === 0) {
    return selectedCountLabel(selectedIds.length);
  }
  if (titles.length <= 2) {
    return titles.join(', ');
  }
  return selectedCountLabel(titles.length);
}

export function AdminMemberTeamsMultiSelect({
  disabled = false,
  onChange,
  options,
  selectedIds,
}: AdminMemberTeamsMultiSelectProps) {
  const { t } = useI18n();

  const displayText = useMemo(
    () =>
      teamsMultiSelectDisplayText(
        options,
        selectedIds,
        t('admin.membersPage.teamsMultiPlaceholder'),
        (count) => t('admin.membersPage.teamsMultiSelectedCount', { count })
      ),
    [options, selectedIds, t]
  );

  return (
    <div>
      <span className={label}>{t('admin.membersPage.teamsMultiLabel')}</span>
      {options.length === 0 ? (
        <p className={`mt-1.5 text-xs ${muted}`}>{t('admin.membersPage.teamsMultiEmpty')}</p>
      ) : (
        <>
          <div className="mt-1.5">
            <SearchableMultiSelect
              disabled={disabled}
              displayText={displayText}
              options={options.map((option) => ({
                key: option.id,
                label: option.title,
                selected: selectedIds.includes(option.id),
              }))}
              placeholderShown={selectedIds.length === 0}
              searchPlaceholder={t('admin.membersPage.teamsMultiSearchPlaceholder')}
              title={t('admin.membersPage.teamsMultiLabel')}
              onToggle={(teamId) => onChange(toggleTeamId(selectedIds, teamId))}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t('admin.membersPage.teamsMultiHint')}
          </p>
        </>
      )}
    </div>
  );
}
