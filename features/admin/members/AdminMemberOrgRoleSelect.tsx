'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { useMemo } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

type OrgDirectoryRole = 'member' | 'org_admin';

interface AdminMemberOrgRoleSelectProps {
  busy: boolean;
  canChange: boolean;
  email: string;
  isOrgAdmin: boolean;
  onChange: (orgRole: OrgDirectoryRole) => void;
}

export function AdminMemberOrgRoleSelect({
  busy,
  canChange,
  email,
  isOrgAdmin,
  onChange,
}: AdminMemberOrgRoleSelectProps) {
  const { t } = useI18n();
  const options = useMemo(
    (): CustomSelectOption<OrgDirectoryRole>[] => [
      { label: t('admin.membersPage.orgRoleMember'), value: 'member' },
      { label: t('admin.membersPage.orgRoleOrgAdmin'), value: 'org_admin' },
    ],
    [t]
  );
  const value: OrgDirectoryRole = isOrgAdmin ? 'org_admin' : 'member';
  const lockedTitle = canChange ? undefined : t('admin.membersPage.cannotChangeOwnRoleTitle');

  return (
    <CustomSelect
      className="w-[9.75rem]"
      disabled={busy || !canChange}
      menuFitContent
      options={options}
      selectedPrefix=""
      size="compact"
      title={lockedTitle ?? t('admin.membersPage.orgRoleSelectTitle', { email })}
      value={value}
      onChange={onChange}
    />
  );
}
