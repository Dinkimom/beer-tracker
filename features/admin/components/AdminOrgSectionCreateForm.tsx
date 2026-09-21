'use client';

import type { FormEvent } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { field, label } from '@/features/admin/adminUiTokens';

interface AdminOrgSectionCreateFormProps {
  createLoading: boolean;
  orgName: string;
  onOrgNameChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function AdminOrgSectionCreateForm({
  createLoading,
  orgName,
  onOrgNameChange,
  onSubmit,
}: AdminOrgSectionCreateFormProps) {
  const { t } = useI18n();

  return (
    <form
      className="max-w-md space-y-3 border-t border-gray-200 pt-5 dark:border-gray-700"
      onSubmit={onSubmit}
    >
      <label className={label} htmlFor="org-name">
        {t('admin.orgSection.createLabel')}
      </label>
      <input
        className={field}
        id="org-name"
        placeholder={t('admin.orgSection.createPlaceholder')}
        required
        type="text"
        value={orgName}
        onChange={(e) => onOrgNameChange(e.target.value)}
      />
      <Button className="px-3.5 py-2" disabled={createLoading} type="submit" variant="primary">
        {createLoading ? t('admin.orgSection.createSubmitting') : t('admin.orgSection.createSubmit')}
      </Button>
    </form>
  );
}
