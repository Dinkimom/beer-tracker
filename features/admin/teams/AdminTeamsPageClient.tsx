"use client";

import type { AdminTeamRow } from "@/features/admin/adminTeamCatalog";

import { useCallback, useState } from "react";

import { Button } from "@/components/Button";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/contexts/LanguageContext";
import { pageStack } from "@/features/admin/adminUiTokens";
import { AdminFormModal } from "@/features/admin/components/AdminFormModal";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

import { AdminNewTeamFormSection } from "./components/AdminNewTeamFormSection";
import { AdminTeamsListRefreshTeamsButton } from "./components/AdminTeamsListRefreshTeamsButton";
import { AdminTeamsListSection } from "./components/AdminTeamsListSection";
import { useAdminTeamsPage } from "./hooks/useAdminTeamsPage";

interface AdminTeamsPageClientProps {
  initialTeams: AdminTeamRow[];
  isOrgAdmin: boolean;
  orgId: string;
}

export function AdminTeamsPageClient({ initialTeams, isOrgAdmin, orgId }: AdminTeamsPageClientProps) {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const page = useAdminTeamsPage({ confirmDestructive: confirm, initialTeams, isOrgAdmin, orgId });
  const [createOpen, setCreateOpen] = useState(false);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  return (
    <div className={pageStack}>
      {DialogComponent}
      <AdminPageHeader
        actions={
          <>
            {isOrgAdmin ? (
              <Button className="px-3.5 py-2" type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                <Icon className="h-4 w-4 shrink-0" name="plus" />
                {t("admin.newTeamForm.openButton")}
              </Button>
            ) : null}
            <AdminTeamsListRefreshTeamsButton
              loadTeams={page.loadTeams}
              orgId={page.orgId}
              teamsLoading={page.teamsLoading}
            />
          </>
        }
        description={
          isOrgAdmin ? t("admin.teamsList.subtitleOrgAdmin") : t("admin.teamsList.subtitleTeamLead")
        }
        title={t("admin.teamsList.title")}
        titleId="admin-teams-heading"
      />
      <AdminTeamsListSection
        boardNameById={page.boardNameById}
        catalogLoading={page.catalogLoading}
        isOrgAdmin={isOrgAdmin}
        teamBusyId={page.teamBusyId}
        teamHref={page.teamHref}
        teamsList={page.teamsList}
        teamsLoading={page.teamsLoading}
        trackerCatalog={page.trackerCatalog}
        onRemoveTeam={page.removeTeam}
        onSetTeamActive={page.setTeamActive}
      />

      {isOrgAdmin ? (
        <AdminFormModal
          busy={page.teamFormSubmitting}
          description={t("admin.newTeamForm.subtitle")}
          isOpen={createOpen}
          maxWidthClassName="max-w-2xl"
          title={t("admin.newTeamForm.title")}
          onClose={closeCreate}
        >
          <AdminNewTeamFormSection
            boardSearchLoading={page.boardSearchLoading}
            boardSelectOptions={page.boardSelectOptions}
            catalogLoading={page.catalogLoading}
            newTeamTitle={page.newTeamTitle}
            orgId={page.orgId}
            queueSelectOptions={page.queueSelectOptions}
            selectTeamBoard={page.selectTeamBoard}
            selectTeamQueue={page.selectTeamQueue}
            setNewTeamTitle={page.setNewTeamTitle}
            setSelectTeamBoard={page.setSelectTeamBoard}
            setSelectTeamQueue={page.setSelectTeamQueue}
            submitNewTeam={async (event) => {
              const ok = await page.submitNewTeam(event);
              if (ok) closeCreate();
              return ok;
            }}
            teamFormSubmitting={page.teamFormSubmitting}
            onBoardSearchQueryChange={page.onBoardSearchQueryChange}
            onCancel={closeCreate}
          />
        </AdminFormModal>
      ) : null}
    </div>
  );
}
