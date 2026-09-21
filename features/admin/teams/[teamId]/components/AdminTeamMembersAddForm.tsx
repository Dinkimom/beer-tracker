'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import { AdminTeamMembersUserPicker } from './AdminTeamMembersUserPicker';

interface AdminTeamMembersAddFormProps {
  addCanAddMember: boolean;
  addLoading: boolean;
  addRoleOptions: CustomSelectOption<string>[];
  addRoleSlug: string;
  addStaffMeta: { displayName?: string; email?: string | null } | null;
  addStaffUid: string;
  orgId: string;
  teamId: string;
  onAddMember: () => void;
  onCancel: () => void;
  setAddRoleSlug: (v: string) => void;
  setAddStaffMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddStaffUid: (v: string) => void;
}

export function AdminTeamMembersAddForm({
  addCanAddMember,
  addLoading,
  addRoleOptions,
  addRoleSlug,
  addStaffMeta,
  addStaffUid,
  onAddMember,
  onCancel,
  orgId,
  setAddRoleSlug,
  setAddStaffMeta,
  setAddStaffUid,
  teamId,
}: AdminTeamMembersAddFormProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <AdminTeamMembersUserPicker
        addStaffMeta={addStaffMeta}
        addStaffUid={addStaffUid}
        orgId={orgId}
        setAddStaffMeta={setAddStaffMeta}
        setAddStaffUid={setAddStaffUid}
        teamId={teamId}
      />
      <CustomSelect
        className="w-full"
        options={addRoleOptions}
        selectedPrefix=""
        title={t('admin.teamMembers.teamRoleTitle')}
        value={addRoleSlug}
        onChange={(slug) => setAddRoleSlug(slug)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={addLoading} type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          disabled={!addCanAddMember || addLoading}
          type="button"
          variant="primary"
          onClick={() => void onAddMember()}
        >
          {addLoading ? t('admin.teamMembers.addLoading') : t('admin.teamMembers.addSubmit')}
        </Button>
      </div>
    </div>
  );
}
