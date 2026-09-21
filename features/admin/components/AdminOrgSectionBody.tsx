'use client';

import type { UserOrganizationSummary } from '@/lib/organizations';
import type { FormEvent } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { cardBody, muted } from '@/features/admin/adminUiTokens';
import { AdminOrgSectionCreateForm } from '@/features/admin/components/AdminOrgSectionCreateForm';
import { AdminOrgSectionOrganizationName } from '@/features/admin/components/AdminOrgSectionOrganizationName';
import { AdminOrgSectionRenameForm } from '@/features/admin/components/AdminOrgSectionRenameForm';

interface AdminOrgSectionBodyProps {
  canRename: boolean;
  createLoading: boolean;
  organization: UserOrganizationSummary | null;
  orgName: string;
  renameDraft: string;
  renameLoading: boolean;
  onOrgNameChange: (value: string) => void;
  onRenameDraftChange: (value: string) => void;
  onRenameSubmit: (e: FormEvent) => void;
  onSubmit: (e: FormEvent) => void;
}

export function AdminOrgSectionBody({
  canRename,
  createLoading,
  organization,
  orgName,
  renameDraft,
  renameLoading,
  onOrgNameChange,
  onRenameDraftChange,
  onRenameSubmit,
  onSubmit,
}: AdminOrgSectionBodyProps) {
  const { t } = useI18n();
  const showCreateForm = organization === null;
  const renameFormHasTopBorder = Boolean(organization && !canRename);

  return (
    <div className={`${cardBody} space-y-5`}>
      {showCreateForm ? <p className={muted}>{t('admin.orgSection.introNoOrg')}</p> : null}
      <AdminOrgSectionOrganizationName canRename={canRename} organization={organization} />
      {canRename ? (
        <AdminOrgSectionRenameForm
          renameDraft={renameDraft}
          renameFormHasTopBorder={renameFormHasTopBorder}
          renameLoading={renameLoading}
          onRenameDraftChange={onRenameDraftChange}
          onRenameSubmit={onRenameSubmit}
        />
      ) : null}
      {showCreateForm ? (
        <AdminOrgSectionCreateForm
          createLoading={createLoading}
          orgName={orgName}
          onOrgNameChange={onOrgNameChange}
          onSubmit={onSubmit}
        />
      ) : null}
    </div>
  );
}
