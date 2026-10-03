'use client';

import type { RetroColumn } from '@/lib/retro/retroBoardShared';
import type { FormEvent } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { adminListShell, cardShell, field } from '@/features/admin/adminUiTokens';
import { RetroTemplateColumnRow } from '@/features/admin/retro/RetroTemplateColumnRow';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import { saveAdminRetroColumnTemplate } from '@/lib/api/retroColumnTemplate';
import {
  addRetroTemplateColumn,
  moveRetroTemplateColumn,
  removeRetroTemplateColumn,
  renameRetroTemplateColumn,
} from '@/lib/retro/retroColumnTemplate';

interface RetroTemplateEditorProps {
  initialColumns: RetroColumn[];
  organizationId: string;
}

function columnCanMoveDown(columns: readonly RetroColumn[], index: number): boolean {
  return index > 0 && index < columns.length - 1;
}

function columnCanMoveUp(index: number): boolean {
  return index > 1;
}

export function RetroTemplateEditor({ initialColumns, organizationId }: RetroTemplateEditorProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState(initialColumns);
  const [draftTitle, setDraftTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const queryKey = ['retro-column-template', organizationId] as const;

  function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    saveAdminRetroColumnTemplate(organizationId, columns)
      .then((saved) => {
        toast.success(t('admin.retroTemplate.saved'));
        queryClient.setQueryData(queryKey, saved);
      })
      .catch((error: unknown) => {
        toast.error(readApiErrorMessage(error, t('admin.retroTemplate.saveError')));
      })
      .finally(() => setSaving(false));
  }

  function addColumn() {
    setColumns((current) => addRetroTemplateColumn(current, draftTitle));
    setDraftTitle('');
  }

  return (
    <form className="space-y-4" onSubmit={save}>
      <div className={cardShell}>
        <ul className={adminListShell}>
          {columns.map((column, index) => (
            <RetroTemplateColumnRow
              key={column.id}
              canDelete={column.role !== 'agreements'}
              canMoveDown={columnCanMoveDown(columns, index)}
              canMoveUp={columnCanMoveUp(index)}
              column={column}
              onDelete={() => setColumns((current) => removeRetroTemplateColumn(current, column.id))}
              onMove={(direction) =>
                setColumns((current) => moveRetroTemplateColumn(current, column.id, direction))
              }
              onRename={(title) => setColumns((current) => renameRetroTemplateColumn(current, column.id, title))}
            />
          ))}
        </ul>
        <div className="flex items-center gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <input
            aria-label={t('admin.retroTemplate.addColumn')}
            className={`${field} min-w-0 flex-1`}
            placeholder={t('admin.retroTemplate.columnName')}
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <Button
            className="h-10 min-w-48 shrink-0 whitespace-nowrap px-5"
            disabled={!draftTitle.trim()}
            type="button"
            variant="outline"
            onClick={addColumn}
          >
            {t('admin.retroTemplate.addColumn')}
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.retroTemplate.agreementsHint')}</p>
      <Button disabled={saving} type="submit">
        {saving ? t('admin.retroTemplate.saving') : t('admin.retroTemplate.save')}
      </Button>
    </form>
  );
}
