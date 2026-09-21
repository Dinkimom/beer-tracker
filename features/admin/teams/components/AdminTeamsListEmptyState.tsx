'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { muted } from '@/features/admin/adminUiTokens';

function resolveAdminTeamsListEmptyMessage(
  isOrgAdmin: boolean,
  teamsLoading: boolean,
  teamsListLength: number,
  t: (key: string) => string
): string | null {
  if (teamsListLength !== 0) {
    return null;
  }
  if (teamsLoading) {
    return t('admin.teamsList.emptyLoading');
  }
  return isOrgAdmin ? t('admin.teamsList.emptyOrgAdmin') : t('admin.teamsList.emptyTeamLead');
}

export function AdminTeamsListEmptyState({
  isOrgAdmin,
  teamsLoading,
  teamsListLength,
}: {
  isOrgAdmin: boolean;
  teamsListLength: number;
  teamsLoading: boolean;
}) {
  const { t } = useI18n();
  const message = resolveAdminTeamsListEmptyMessage(isOrgAdmin, teamsLoading, teamsListLength, t);
  if (!message) {
    return null;
  }
  return <p className={muted}>{message}</p>;
}
