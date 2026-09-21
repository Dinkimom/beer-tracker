'use client';

import type { FormEvent } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { field, label } from '@/features/admin/adminUiTokens';

interface AdminOrgSectionRenameFormProps {
  renameDraft: string;
  renameFormHasTopBorder: boolean;
  renameLoading: boolean;
  onRenameDraftChange: (value: string) => void;
  onRenameSubmit: (e: FormEvent) => void;
}

export function AdminOrgSectionRenameForm({
  renameDraft,
  renameFormHasTopBorder,
  renameLoading,
  onRenameDraftChange,
  onRenameSubmit,
}: AdminOrgSectionRenameFormProps) {
  const { t } = useI18n();

  return (
    <form
      className={`max-w-xl ${renameFormHasTopBorder ? 'border-t border-gray-100 pt-5 dark:border-white/[0.06]' : ''}`}
      onSubmit={onRenameSubmit}
    >
      <label className={label} htmlFor="org-rename">
        {t('admin.orgSection.renameLabel')}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className={field}
          id="org-rename"
          placeholder={t('admin.orgSection.renamePlaceholder')}
          required
          type="text"
          value={renameDraft}
          onChange={(e) => onRenameDraftChange(e.target.value)}
        />
        <Button className="shrink-0 px-3.5 py-2" disabled={renameLoading} type="submit" variant="primary">
          {renameLoading ? t('admin.orgSection.renameSaving') : t('admin.orgSection.renameSubmit')}
        </Button>
      </div>
    </form>
  );
}
