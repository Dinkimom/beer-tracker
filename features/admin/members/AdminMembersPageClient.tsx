'use client';

import type { AdminMemberTeamOption } from '@/features/admin/members/AdminMemberTeamsMultiSelect';
import type { RegistryEmployeeDirectoryRow } from '@/lib/organizations/organizationMembersRepository';

import { useCallback, useState } from 'react';

import { Button } from '@/components/Button';
import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { SearchInput } from '@/components/SearchInput';
import { useI18n } from '@/contexts/LanguageContext';
import {
  adminListShell,
  cardBody,
  cardHeader,
  cardShell,
  muted,
} from '@/features/admin/adminUiTokens';
import { AdminFormModal } from '@/features/admin/components/AdminFormModal';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminMemberForm } from '@/features/admin/members/AdminMemberForm';
import { AdminMemberRow } from '@/features/admin/members/AdminMemberRow';
import { useAdminMembersPage } from '@/features/admin/members/hooks/useAdminMembersPage';

interface AdminMembersPageClientProps {
  currentUserId: string;
  orgId: string;
  rows: RegistryEmployeeDirectoryRow[];
  teamOptions: AdminMemberTeamOption[];
}

export function AdminMembersPageClient({
  currentUserId,
  orgId,
  rows,
  teamOptions,
}: AdminMembersPageClientProps) {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const page = useAdminMembersPage({
    confirmDestructive: confirm,
    currentUserId,
    initialRows: rows,
    orgId,
    teamOptions,
  });
  const { cancelEdit, removeMember, startEdit, submitCreate, submitEdit, updateOrgRole } = page;
  const [inviteOpen, setInviteOpen] = useState(false);
  const closeInvite = useCallback(() => setInviteOpen(false), []);
  const editOpen = page.editingId != null;
  const editBusy = page.editingId != null && page.busyId === page.editingId;

  let membersListBody;
  if (!page.hasAnyMembers) {
    membersListBody = (
      <div className={cardBody}>
        <p className={muted}>{t('admin.membersPage.emptyState')}</p>
      </div>
    );
  } else if (page.sortedRows.length === 0) {
    membersListBody = (
      <div className={cardBody}>
        <p className={muted}>{t('admin.membersPage.listSearchEmpty')}</p>
      </div>
    );
  } else {
    membersListBody = (
      <ul className={adminListShell}>
        {page.sortedRows.map((row) => (
          <AdminMemberRow
            key={row.staff_uid}
            busy={page.busyId === row.staff_uid}
            canChangeOrgRole={row.staff_uid !== currentUserId}
            canDelete={row.staff_uid !== currentUserId}
            row={row}
            onDelete={() => void removeMember(row)}
            onEdit={() => startEdit(row)}
            onOrgRoleChange={(orgRole) => void updateOrgRole(row, orgRole)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {DialogComponent}
      <AdminPageHeader
        actions={
          <Button
            className="shrink-0 px-3.5 py-2"
            type="button"
            variant="primary"
            onClick={() => setInviteOpen(true)}
          >
            <Icon className="h-4 w-4 shrink-0" name="plus" />
            {t('admin.membersPage.inviteOpenButton')}
          </Button>
        }
        description={t('admin.membersPage.subtitle')}
        title={t('admin.membersPage.title')}
      />
      <section className={`${cardShell} flex min-h-0 flex-1 flex-col`}>
        {page.hasAnyMembers ? (
          <div className={`${cardHeader} shrink-0`}>
            <SearchInput
              placeholder={t('admin.membersPage.listSearchPlaceholder')}
              size="md"
              value={page.listQuery}
              onChange={page.setListQuery}
            />
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{membersListBody}</div>
      </section>

      <AdminFormModal
        busy={page.createSubmitting}
        isOpen={inviteOpen}
        title={t('admin.membersPage.inviteSectionTitle')}
        onClose={closeInvite}
      >
        <AdminMemberForm
          busy={page.createSubmitting}
          idPrefix="create-member"
          orgId={orgId}
          resetIdentityOnClear
          submitLabel={t('admin.membersPage.inviteSubmit')}
          teamOptions={page.teamOptions}
          values={page.createValues}
          onCancel={closeInvite}
          onChange={page.setCreateValues}
          onSubmit={async (event) => {
            const ok = await submitCreate(event);
            if (ok) closeInvite();
          }}
        />
      </AdminFormModal>

      <AdminFormModal
        busy={editBusy}
        isOpen={editOpen}
        title={t('admin.membersPage.editSectionTitle')}
        onClose={cancelEdit}
      >
        <AdminMemberForm
          busy={editBusy}
          idPrefix={`edit-${page.editingId ?? 'member'}`}
          orgId={orgId}
          resetIdentityOnClear={false}
          submitLabel={t('common.save')}
          teamOptions={page.teamOptions}
          values={page.editValues}
          onCancel={cancelEdit}
          onChange={page.setEditValues}
          onSubmit={(event) => void submitEdit(event)}
        />
      </AdminFormModal>
    </div>
  );
}
