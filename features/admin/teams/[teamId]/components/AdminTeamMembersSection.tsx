'use client';

import type { CustomSelectOption } from "@/components/CustomSelect";
import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";
import type { AdminTeamMemberAddSource } from "@/features/admin/teams/[teamId]/components/AdminTeamMembersAddForm";

import { useCallback, useState } from "react";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/contexts/LanguageContext";
import {
  adminListShell,
  adminTeamRosterTableHeader,
  cardBody,
  cardHeader,
  cardShell,
  hCard,
  muted,
} from "@/features/admin/adminUiTokens";
import { AdminFormModal } from "@/features/admin/components/AdminFormModal";

import { AdminTeamMemberRow } from "./AdminTeamMemberRow";
import { AdminTeamMembersAddForm } from "./AdminTeamMembersAddForm";

interface AdminTeamMembersSectionProps {
  addCanAddMember: boolean;
  addLoading: boolean;
  addRoleOptions: CustomSelectOption<string>[];
  addRoleSlug: string;
  addSource: AdminTeamMemberAddSource;
  addStaffMeta: { displayName?: string; email?: string | null } | null;
  addStaffUid: string;
  addTrackerMeta: { displayName?: string; email?: string | null } | null;
  addTrackerUserId: string;
  memberBusyId: string | null;
  members: AdminTeamMember[];
  orgId: string;
  roleOptions: CustomSelectOption<string>[];
  teamId: string;
  onAddMember: () => Promise<boolean>;
  onRemoveMember: (staffId: string) => void;
  onUpdateMemberRole: (staffId: string, roleSlug: string | null) => void;
  setAddRoleSlug: (v: string) => void;
  setAddSource: (v: AdminTeamMemberAddSource) => void;
  setAddStaffMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddStaffUid: (v: string) => void;
  setAddTrackerMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddTrackerUserId: (v: string) => void;
}

export function AdminTeamMembersSection({
  addCanAddMember,
  addLoading,
  addRoleOptions,
  addRoleSlug,
  addSource,
  addStaffMeta,
  addStaffUid,
  addTrackerMeta,
  addTrackerUserId,
  memberBusyId,
  members,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  orgId,
  roleOptions,
  setAddRoleSlug,
  setAddSource,
  setAddStaffMeta,
  setAddStaffUid,
  setAddTrackerMeta,
  setAddTrackerUserId,
  teamId,
}: AdminTeamMembersSectionProps) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const modalTitle =
    addSource === "tracker"
      ? t("admin.teamMembers.addCreateTitle")
      : t("admin.teamMembers.addFromRegistryTitle");
  const modalDescription =
    addSource === "tracker"
      ? t("admin.teamMembers.addCreateHint")
      : t("admin.teamMembers.addFromRegistryHint");

  return (
    <section className={cardShell}>
      <div
        className={`${cardHeader} flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6`}
      >
        <h2 className={`${hCard} flex items-center gap-2`}>
          {t("admin.teamMembers.title")}
          {members.length > 0 ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
              {members.length}
            </span>
          ) : null}
        </h2>
        <Button
          className="shrink-0 px-3.5 py-2"
          type="button"
          variant="primary"
          onClick={() => setAddOpen(true)}
        >
          <Icon className="h-4 w-4 shrink-0" name="plus" />
          {t("admin.teamMembers.addOpenButton")}
        </Button>
      </div>
      {members.length === 0 ? (
        <div className={cardBody}>
          <p className={muted}>{t("admin.teamMembers.noMembers")}</p>
        </div>
      ) : (
        <>
          <div className={adminTeamRosterTableHeader} role="presentation">
            <span>{t("admin.teamMembers.tableStaff")}</span>
            <span className="min-w-0 leading-snug">{t("admin.teamMembers.tableTeamRole")}</span>
            <span className="sr-only">{t("admin.teamMembers.deleteSr")}</span>
          </div>
          <ul className={adminListShell}>
            {members.map((m) => (
              <AdminTeamMemberRow
                key={m.staff_id}
                busy={memberBusyId === m.staff_id}
                member={m}
                roleOptions={roleOptions}
                onRemove={onRemoveMember}
                onRoleChange={onUpdateMemberRole}
              />
            ))}
          </ul>
        </>
      )}
      <AdminFormModal
        busy={addLoading}
        description={modalDescription}
        isOpen={addOpen}
        title={modalTitle}
        onClose={closeAdd}
      >
        <AdminTeamMembersAddForm
          addCanAddMember={addCanAddMember}
          addLoading={addLoading}
          addRoleOptions={addRoleOptions}
          addRoleSlug={addRoleSlug}
          addSource={addSource}
          addStaffMeta={addStaffMeta}
          addStaffUid={addStaffUid}
          addTrackerMeta={addTrackerMeta}
          addTrackerUserId={addTrackerUserId}
          orgId={orgId}
          setAddRoleSlug={setAddRoleSlug}
          setAddSource={setAddSource}
          setAddStaffMeta={setAddStaffMeta}
          setAddStaffUid={setAddStaffUid}
          setAddTrackerMeta={setAddTrackerMeta}
          setAddTrackerUserId={setAddTrackerUserId}
          teamId={teamId}
          onAddMember={async () => {
            const ok = await onAddMember();
            if (ok) closeAdd();
          }}
          onCancel={closeAdd}
        />
      </AdminFormModal>
    </section>
  );
}
