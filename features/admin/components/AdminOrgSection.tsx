'use client';

import type { UserOrganizationSummary } from '@/lib/organizations';
import type { FormEvent } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { cardShell, pageStack } from '@/features/admin/adminUiTokens';
import { AdminOrgSectionBody } from '@/features/admin/components/AdminOrgSectionBody';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';

interface AdminOrgSectionProps {
  'aria-labelledby'?: string;
  canRename: boolean;
  createLoading: boolean;
  id?: string;
  organization: UserOrganizationSummary | null;
  orgName: string;
  renameDraft: string;
  renameLoading: boolean;
  onOrgNameChange: (value: string) => void;
  onRenameDraftChange: (value: string) => void;
  onRenameSubmit: (e: FormEvent) => void;
  onSubmit: (e: FormEvent) => void;
}

export function AdminOrgSection({
  'aria-labelledby': ariaLabelledBy,
  canRename,
  createLoading,
  id,
  organization,
  orgName,
  renameDraft,
  renameLoading,
  onOrgNameChange,
  onRenameDraftChange,
  onRenameSubmit,
  onSubmit,
}: AdminOrgSectionProps) {
  const { t } = useI18n();
  const showCreateForm = organization === null;

  return (
    <div className={pageStack}>
      <AdminPageHeader
        description={showCreateForm ? t('admin.orgSection.introCreateOne') : undefined}
        title={t('admin.orgSection.title')}
      />
      <section aria-labelledby={ariaLabelledBy} className={cardShell} id={id} role="tabpanel">
        <AdminOrgSectionBody
          canRename={canRename}
          createLoading={createLoading}
          orgName={orgName}
          organization={organization}
          renameDraft={renameDraft}
          renameLoading={renameLoading}
          onOrgNameChange={onOrgNameChange}
          onRenameDraftChange={onRenameDraftChange}
          onRenameSubmit={onRenameSubmit}
          onSubmit={onSubmit}
        />
      </section>
    </div>
  );
}
