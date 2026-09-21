'use client';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

export function AdminTeamsListRefreshTeamsButton({
  loadTeams,
  orgId,
  teamsLoading,
}: {
  loadTeams: () => Promise<void>;
  orgId: string;
  teamsLoading: boolean;
}) {
  const { t } = useI18n();
  return (
    <Button
      className="px-3.5 py-2"
      disabled={teamsLoading || !orgId}
      type="button"
      variant="outline"
      onClick={() => void loadTeams()}
    >
      {teamsLoading ? t('admin.teamsList.refreshListLoading') : t('admin.teamsList.refreshList')}
    </Button>
  );
}
