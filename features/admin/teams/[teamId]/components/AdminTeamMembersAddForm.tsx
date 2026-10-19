'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { tabBtnActive, tabBtnBase, tabBtnIdle, tabList } from '@/features/admin/adminUiTokens';

import { AdminTeamMembersTrackerPicker } from './AdminTeamMembersTrackerPicker';
import { AdminTeamMembersUserPicker } from './AdminTeamMembersUserPicker';

export type AdminTeamMemberAddSource = 'registry' | 'tracker';

interface AdminTeamMembersAddFormProps {
  addCanAddMember: boolean;
  addLoading: boolean;
  addRoleOptions: CustomSelectOption<string>[];
  addRoleSlug: string;
  addSource: AdminTeamMemberAddSource;
  addStaffMeta: { displayName?: string; email?: string | null } | null;
  addStaffUid: string;
  addTrackerMeta: { displayName?: string; email?: string | null } | null;
  addTrackerUserId: string;
  orgId: string;
  teamId: string;
  onAddMember: () => void;
  onCancel: () => void;
  setAddRoleSlug: (v: string) => void;
  setAddSource: (v: AdminTeamMemberAddSource) => void;
  setAddStaffMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddStaffUid: (v: string) => void;
  setAddTrackerMeta: (v: { displayName?: string; email?: string | null } | null) => void;
  setAddTrackerUserId: (v: string) => void;
}

export function AdminTeamMembersAddForm({
  addCanAddMember,
  addLoading,
  addRoleOptions,
  addRoleSlug,
  addSource,
  addStaffMeta,
  addStaffUid,
  addTrackerMeta,
  addTrackerUserId,
  onAddMember,
  onCancel,
  orgId,
  setAddRoleSlug,
  setAddSource,
  setAddStaffMeta,
  setAddStaffUid,
  setAddTrackerMeta,
  setAddTrackerUserId,
  teamId,
}: AdminTeamMembersAddFormProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div
        aria-label={t('admin.teamMembers.addSourceAria')}
        className={tabList}
        role="tablist"
      >
        <Button
          aria-selected={addSource === 'registry'}
          className={`${tabBtnBase} !flex !min-h-0 !justify-center ${
            addSource === 'registry' ? tabBtnActive : tabBtnIdle
          }`}
          role="tab"
          type="button"
          variant="ghost"
          onClick={() => setAddSource('registry')}
        >
          {t('admin.teamMembers.addSourceRegistry')}
        </Button>
        <Button
          aria-selected={addSource === 'tracker'}
          className={`${tabBtnBase} !flex !min-h-0 !justify-center ${
            addSource === 'tracker' ? tabBtnActive : tabBtnIdle
          }`}
          role="tab"
          type="button"
          variant="ghost"
          onClick={() => setAddSource('tracker')}
        >
          {t('admin.teamMembers.addSourceTracker')}
        </Button>
      </div>
      {addSource === 'registry' ? (
        <AdminTeamMembersUserPicker
          addStaffMeta={addStaffMeta}
          addStaffUid={addStaffUid}
          orgId={orgId}
          setAddStaffMeta={setAddStaffMeta}
          setAddStaffUid={setAddStaffUid}
          teamId={teamId}
        />
      ) : (
        <AdminTeamMembersTrackerPicker
          addTrackerMeta={addTrackerMeta}
          addTrackerUserId={addTrackerUserId}
          orgId={orgId}
          setAddTrackerMeta={setAddTrackerMeta}
          setAddTrackerUserId={setAddTrackerUserId}
        />
      )}
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
