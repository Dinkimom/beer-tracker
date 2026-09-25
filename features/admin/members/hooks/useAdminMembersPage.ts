import type { ConfirmDialogPromptOptions } from '@/components/ConfirmDialog';
import type { AdminMemberFormValues } from '@/features/admin/members/AdminMemberForm';
import type { AdminMemberTeamOption } from '@/features/admin/members/AdminMemberTeamsMultiSelect';
import type { RegistryEmployeeDirectoryRow } from '@/lib/organizations/organizationMembersRepository';
import type { FormEvent } from 'react';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  memberDisplayName,
  memberMatchesListQuery,
  sortMembersByDisplayName,
} from '@/features/admin/members/adminMemberDisplay';
import { patchAdminOrganizationMemberRole } from '@/lib/api/admin/members';
import { createAdminStaff, deleteAdminStaff, patchAdminStaff } from '@/lib/api/admin/staff';
import { readApiErrorMessage } from '@/lib/api/readApiError';

const EMPTY_FORM: AdminMemberFormValues = {
  displayName: '',
  email: '',
  teamIds: [],
  trackerUserId: '',
};

function valuesFromRow(row: RegistryEmployeeDirectoryRow): AdminMemberFormValues {
  const name = memberDisplayName(row);
  return {
    displayName: name === '—' ? '' : name,
    email: row.email?.trim() ?? '',
    teamIds: row.teams.map((team) => team.team_id),
    trackerUserId: row.tracker_id?.trim() ?? '',
  };
}

function payloadFromValues(values: AdminMemberFormValues) {
  return {
    display_name: values.displayName.trim(),
    email: values.email.trim() || null,
    team_ids: values.teamIds,
    tracker_user_id: values.trackerUserId.trim() || null,
  };
}

interface UseAdminMembersPageParams {
  currentUserId: string;
  initialRows: RegistryEmployeeDirectoryRow[];
  orgId: string;
  teamOptions: AdminMemberTeamOption[];
  confirmDestructive: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
}

export function useAdminMembersPage({
  confirmDestructive,
  currentUserId,
  initialRows,
  orgId,
  teamOptions,
}: UseAdminMembersPageParams) {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [listQuery, setListQuery] = useState('');
  const [createValues, setCreateValues] = useState(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const sortedRows = useMemo(() => {
    const sorted = sortMembersByDisplayName(rows);
    const q = listQuery.trim();
    if (q.length === 0) return sorted;
    return sorted.filter((row) => memberMatchesListQuery(row, q));
  }, [listQuery, rows]);

  const startEdit = useCallback((row: RegistryEmployeeDirectoryRow) => {
    setEditingId(row.staff_uid);
    setEditValues(valuesFromRow(row));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues(EMPTY_FORM);
  }, []);

  const submitCreate = useCallback(
    async (event: FormEvent): Promise<boolean> => {
      event.preventDefault();
      if (!orgId || !createValues.displayName.trim()) return false;
      if (!createValues.trackerUserId.trim()) {
        toast.error(t('admin.membersPage.trackerUserRequired'));
        return false;
      }
      setCreateSubmitting(true);
      try {
        await createAdminStaff(orgId, payloadFromValues(createValues));
        toast.success(t('admin.membersPage.inviteCreatedSuccess'));
        setCreateValues(EMPTY_FORM);
        router.refresh();
        return true;
      } catch (error) {
        toast.error(readApiErrorMessage(error, t('admin.membersPage.inviteSendFailed')));
        return false;
      } finally {
        setCreateSubmitting(false);
      }
    },
    [createValues, orgId, router, t]
  );

  const submitEdit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!orgId || !editingId || !editValues.displayName.trim()) return;
      setBusyId(editingId);
      try {
        await patchAdminStaff(orgId, editingId, payloadFromValues(editValues));
        toast.success(t('admin.membersPage.updatedSuccess'));
        setEditingId(null);
        router.refresh();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t('admin.membersPage.updateFailed')));
      } finally {
        setBusyId(null);
      }
    },
    [editValues, editingId, orgId, router, t]
  );

  const updateOrgRole = useCallback(
    async (row: RegistryEmployeeDirectoryRow, orgRole: 'member' | 'org_admin') => {
      if (!orgId || row.staff_uid === currentUserId) return;
      const nextIsAdmin = orgRole === 'org_admin';
      if (row.is_org_admin === nextIsAdmin) return;
      setBusyId(row.staff_uid);
      try {
        await patchAdminOrganizationMemberRole(orgId, row.staff_uid, orgRole);
        setRows((prev) =>
          prev.map((item) =>
            item.staff_uid === row.staff_uid ? { ...item, is_org_admin: nextIsAdmin } : item
          )
        );
        toast.success(t('admin.membersPage.orgRoleUpdated'));
        router.refresh();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t('admin.membersPage.orgRoleUpdateFailed')));
      } finally {
        setBusyId(null);
      }
    },
    [currentUserId, orgId, router, t]
  );

  const removeMember = useCallback(
    async (row: RegistryEmployeeDirectoryRow) => {
      if (!orgId) return;
      const label = row.email?.trim() || memberDisplayName(row);
      const confirmed = await confirmDestructive(
        t('admin.membersPage.deleteUserMessage', { email: label }),
        {
          confirmText: t('common.delete'),
          title: t('admin.membersPage.deleteUserTitle'),
          variant: 'destructive',
        }
      );
      if (!confirmed) return;
      setBusyId(row.staff_uid);
      try {
        await deleteAdminStaff(orgId, row.staff_uid);
        toast.success(t('admin.membersPage.userDeleted'));
        if (editingId === row.staff_uid) {
          setEditingId(null);
        }
        router.refresh();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t('admin.membersPage.userDeleteFailed')));
      } finally {
        setBusyId(null);
      }
    },
    [confirmDestructive, editingId, orgId, router, t]
  );

  return {
    busyId,
    cancelEdit,
    createSubmitting,
    createValues,
    editValues,
    editingId,
    hasAnyMembers: rows.length > 0,
    listQuery,
    removeMember,
    setCreateValues,
    setEditValues,
    setListQuery,
    sortedRows,
    startEdit,
    submitCreate,
    submitEdit,
    teamOptions,
    updateOrgRole,
  };
}
