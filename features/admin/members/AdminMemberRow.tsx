import type { RegistryEmployeeDirectoryRow } from '@/lib/organizations/organizationMembersRepository';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { adminListRow } from '@/features/admin/adminUiTokens';
import { memberDisplayName, memberInitials } from '@/features/admin/members/adminMemberDisplay';
import { AdminMemberOrgRoleSelect } from '@/features/admin/members/AdminMemberOrgRoleSelect';

interface AdminMemberRowProps {
  busy: boolean;
  canChangeOrgRole: boolean;
  canDelete: boolean;
  row: RegistryEmployeeDirectoryRow;
  onDelete: () => void;
  onEdit: () => void;
  onOrgRoleChange: (orgRole: 'member' | 'org_admin') => void;
}

export function AdminMemberRow({
  busy,
  canChangeOrgRole,
  canDelete,
  onDelete,
  onEdit,
  onOrgRoleChange,
  row,
}: AdminMemberRowProps) {
  const { t } = useI18n();
  const name = memberDisplayName(row);
  const teamsLine =
    row.teams.length > 0 ? row.teams.map((team) => team.team_title).join(', ') : '—';

  return (
    <li className={adminListRow}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar avatarUrl={row.avatar_link} initials={memberInitials(row)} size="md" title={name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {row.email || t('admin.membersPage.emailEmpty')}
            </p>
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
              {t('admin.membersPage.teamsLine', { teams: teamsLine })}
            </p>
            {row.tracker_id ? (
              <p className="mt-1 truncate font-mono text-xs text-gray-400 dark:text-gray-500">
                {row.tracker_id}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <AdminMemberOrgRoleSelect
            busy={busy}
            canChange={canChangeOrgRole}
            email={row.email?.trim() || name}
            isOrgAdmin={row.is_org_admin}
            onChange={onOrgRoleChange}
          />
          <Button
            aria-label={t('admin.membersPage.editAria', { name })}
            className="px-3 py-1.5 text-xs"
            disabled={busy}
            type="button"
            variant="outline"
            onClick={onEdit}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" name="edit" />
            {t('admin.membersPage.edit')}
          </Button>
          <Button
            aria-label={t('admin.membersPage.deleteAria', { name })}
            className="px-3 py-1.5 text-xs"
            disabled={busy || !canDelete}
            title={canDelete ? undefined : t('admin.membersPage.cannotDeleteSelfTitle')}
            type="button"
            variant="dangerOutline"
            onClick={onDelete}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </li>
  );
}
