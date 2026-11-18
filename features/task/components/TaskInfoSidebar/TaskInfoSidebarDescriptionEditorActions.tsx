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
      className="flex items-center justify-end gap-2 px-3 py-2.5"
      data-description-editor-chrome=""
    >
      <Button
        disabled={disabled}
        variant="ghost"
        onClick={onCancel}
        onMouseDown={(event) => {
          event.preventDefault();
        }}
      >
        {t('common.cancel')}
      </Button>
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
