'use client';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

interface TaskInfoSidebarDescriptionEditorActionsProps {
  disabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function TaskInfoSidebarDescriptionEditorActions({
  disabled = false,
  onCancel,
  onSave,
}: TaskInfoSidebarDescriptionEditorActionsProps) {
  const { t } = useI18n();

  return (
    <div
      className="flex items-center justify-end gap-3 px-3 py-2.5"
      data-description-editor-chrome=""
    >
      <button
        className="cursor-pointer border-0 bg-transparent px-1 py-1 text-sm text-gray-500 transition-colors hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-100"
        disabled={disabled}
        type="button"
        onClick={onCancel}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        {t('common.cancel')}
      </button>
      <Button
        disabled={disabled}
        type="button"
        variant="primary"
        onClick={onSave}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        {t('common.save')}
      </Button>
    </div>
  );
}
