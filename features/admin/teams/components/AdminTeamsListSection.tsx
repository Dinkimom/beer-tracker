'use client';

import type { AdminTeamRow, AdminTrackerCatalogPayload } from "@/features/admin/adminTeamCatalog";

import { cardShell } from "@/features/admin/adminUiTokens";

import { AdminTeamsListSectionBody } from "./AdminTeamsListSectionBody";

interface AdminTeamsListSectionProps {
  boardNameById: Map<number, string>;
  catalogLoading: boolean;
  isOrgAdmin: boolean;
  teamBusyId: string | null;
  teamsList: AdminTeamRow[];
  teamsLoading: boolean;
  trackerCatalog: AdminTrackerCatalogPayload | null;
  onRemoveTeam: (teamId: string) => Promise<void>;
  onSetTeamActive: (teamId: string, active: boolean) => Promise<void>;
  teamHref: (teamId: string) => string;
}

export function AdminTeamsListSection({
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
}: AdminTeamsListSectionProps) {
  return (
    <section aria-labelledby="admin-teams-heading" className={cardShell}>
      <AdminTeamsListSectionBody
        boardNameById={boardNameById}
        catalogLoading={catalogLoading}
        isOrgAdmin={isOrgAdmin}
        teamBusyId={teamBusyId}
        teamHref={teamHref}
        teamsList={teamsList}
        teamsLoading={teamsLoading}
        trackerCatalog={trackerCatalog}
        onRemoveTeam={onRemoveTeam}
        onSetTeamActive={onSetTeamActive}
      />
    </section>
  );
}
