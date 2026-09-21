'use client';

import type { AdminTeamRow, AdminTrackerCatalogPayload } from '@/features/admin/adminTeamCatalog';

import { useI18n } from '@/contexts/LanguageContext';
import { adminListShell, cardBody } from '@/features/admin/adminUiTokens';

import { AdminTeamListRow } from './AdminTeamListRow';
import { AdminTeamsListEmptyState } from './AdminTeamsListEmptyState';

function resolveAdminTeamBoardTitleText(params: {
  boardNameFromCatalog: string | undefined;
  boardId: string;
  catalogLoading: boolean;
  isOrgAdmin: boolean;
  t: (key: string) => string;
  trackerCatalog: unknown;
}): string {
  if (params.boardNameFromCatalog) return params.boardNameFromCatalog;
  if (!params.isOrgAdmin) return `id ${params.boardId}`;
  if (params.catalogLoading) return params.t("admin.teamsList.boardTitleLoading");
  if (params.trackerCatalog) return params.t("admin.teamsList.boardTitleMissing");
  return params.t("admin.teamsList.boardTitleCatalogNotLoaded");
}

function resolveTeamBoardName(
  boardNameById: Map<number, string>,
  boardId: string
): string | undefined {
  const boardIdNum = Number.parseInt(boardId, 10);
  if (!Number.isFinite(boardIdNum) || boardIdNum <= 0) {
    return undefined;
  }
  return boardNameById.get(boardIdNum);
}

export function AdminTeamsListSectionBody({
  boardNameById,
  catalogLoading,
  isOrgAdmin,
  onRemoveTeam,
  onSetTeamActive,
  teamBusyId,
  teamHref,
  teamsList,
  teamsLoading,
  trackerCatalog,
}: {
  boardNameById: Map<number, string>;
  catalogLoading: boolean;
  isOrgAdmin: boolean;
  teamsList: AdminTeamRow[];
  teamsLoading: boolean;
  trackerCatalog: AdminTrackerCatalogPayload | null;
  teamBusyId: string | null;
  teamHref: (teamId: string) => string;
  onRemoveTeam: (teamId: string) => Promise<void>;
  onSetTeamActive: (teamId: string, active: boolean) => Promise<void>;
}) {
  const { t } = useI18n();
  const emptyState = (
    <AdminTeamsListEmptyState
      isOrgAdmin={isOrgAdmin}
      teamsListLength={teamsList.length}
      teamsLoading={teamsLoading}
    />
  );

  if (teamsList.length === 0) {
    return <div className={cardBody}>{emptyState}</div>;
  }

  return (
    <ul className={adminListShell}>
      {teamsList.map((team) => {
        const boardNameFromCatalog = resolveTeamBoardName(boardNameById, team.tracker_board_id);
        const boardTitleText = resolveAdminTeamBoardTitleText({
          boardNameFromCatalog,
          boardId: team.tracker_board_id,
          catalogLoading,
          isOrgAdmin,
          t,
          trackerCatalog,
        });
        return (
          <AdminTeamListRow
            key={team.id}
            boardNameFromCatalog={boardNameFromCatalog}
            boardTitleText={boardTitleText}
            busy={teamBusyId === team.id}
            detailHref={teamHref(team.id)}
            showRemoveTeam={isOrgAdmin}
            team={team}
            onRemove={() => void onRemoveTeam(team.id)}
            onToggleActive={(next) => void onSetTeamActive(team.id, next)}
          />
        );
      })}
    </ul>
  );
}
