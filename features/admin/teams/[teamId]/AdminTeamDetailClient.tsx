"use client";

import type { AdminTeamMember, AdminTeamRow } from "@/features/admin/adminTeamCatalog";

import { useConfirmDialog } from "@/components/ConfirmDialog";

import { AdminTeamDetailBreadcrumb } from "./components/AdminTeamDetailBreadcrumb";
import { AdminTeamMembersSection } from "./components/AdminTeamMembersSection";
import { AdminTeamSettingsSection } from "./components/AdminTeamSettingsSection";
import { useAdminTeamDetailPage } from "./hooks/useAdminTeamDetailPage";

interface AdminTeamDetailClientProps {
  initialMembers: AdminTeamMember[];
  initialTeam: AdminTeamRow;
  isOrgAdmin: boolean;
  orgId: string;
}

export function AdminTeamDetailClient({
  initialMembers,
  initialTeam,
  isOrgAdmin,
  orgId,
}: AdminTeamDetailClientProps) {
  const { confirm, DialogComponent } = useConfirmDialog();
  const t = useAdminTeamDetailPage({
    confirmDestructive: confirm,
    initialMembers,
    initialTeam,
    isOrgAdmin,
    orgId,
  });

  return (
    <div className="space-y-6">
      {DialogComponent}
      <AdminTeamDetailBreadcrumb
        backHref={t.backHref}
        editTitle={t.editTitle}
        initialTeam={t.initialTeam}
      />
      <AdminTeamSettingsSection
        boardOptions={t.boardOptions}
        boardSearchLoading={t.boardSearchLoading}
        catalogLoading={t.catalogLoading}
        editBoard={t.editBoard}
        editQueue={t.editQueue}
        editSaving={t.editSaving}
        editTitle={t.editTitle}
        initialTeam={t.initialTeam}
        isOrgAdmin={isOrgAdmin}
        queueOptions={t.queueOptions}
        setEditBoard={t.setEditBoard}
        setEditQueue={t.setEditQueue}
        setEditTitle={t.setEditTitle}
        onBoardSearchQueryChange={t.onBoardSearchQueryChange}
        onSave={t.saveTeam}
      />
      <AdminTeamMembersSection
        addCanAddMember={t.addCanAddMember}
        addForm={t}
        addLoading={t.addLoading}
        memberBusyId={t.memberBusyId}
        members={t.members}
        orgId={orgId}
        roleOptions={t.roleOptions}
        teamId={initialTeam.id}
        onAddMember={t.addMember}
        onRemoveMember={t.removeMember}
        onUpdateMemberRole={t.updateMemberRole}
      />
    </div>
  );
}
