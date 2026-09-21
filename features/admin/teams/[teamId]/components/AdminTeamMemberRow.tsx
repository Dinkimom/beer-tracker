import type { CustomSelectOption } from "@/components/CustomSelect";
import type { AdminTeamMember } from "@/features/admin/adminTeamCatalog";

import { CustomSelect } from "@/components/CustomSelect";
import { useI18n } from "@/contexts/LanguageContext";
import { adminListRow, adminTeamRosterGrid } from "@/features/admin/adminUiTokens";

import { AdminTeamMemberRowIdentity } from "./AdminTeamMemberRowIdentity";
import { AdminTeamMemberRowRemoveButton } from "./AdminTeamMemberRowRemoveButton";

interface AdminTeamMemberRowProps {
  busy: boolean;
  member: AdminTeamMember;
  roleOptions: CustomSelectOption<string>[];
  onRemove: (staffId: string) => void;
  onRoleChange: (staffId: string, roleSlug: string | null) => void;
}

export function AdminTeamMemberRow({
  busy,
  member,
  roleOptions,
  onRemove,
  onRoleChange,
}: AdminTeamMemberRowProps) {
  const { t } = useI18n();

  const showPlannerHint = member.product_user_in_org && !member.product_team_access;

  return (
    <li className={[adminListRow, adminTeamRosterGrid].join(" ")}>
      <AdminTeamMemberRowIdentity member={member} showPlannerHint={showPlannerHint} t={t} />
      <div className="min-w-0 space-y-1 sm:space-y-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:hidden dark:text-gray-400">
          {t("admin.teamMemberRow.teamRole")}
        </p>
        <CustomSelect
          className="w-full"
          options={roleOptions}
          selectedPrefix=""
          title={t("admin.teamMemberRow.teamRoleTitle")}
          value={member.role_slug ?? ""}
          onChange={(slug) => void onRoleChange(member.staff_id, slug || null)}
        />
      </div>
      <AdminTeamMemberRowRemoveButton
        busy={busy}
        displayName={member.staff_display_name}
        onRemove={() => void onRemove(member.staff_id)}
      />
    </li>
  );
}
