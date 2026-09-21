'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { MouseEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useTaskCardSwimlaneDiagramDraft } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneDiagramDraftContext';
import { useTaskCardSwimlaneImageDraft } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneImageDraftContext';

import { TaskBarDraftNoteColorDropdown } from './TaskBarDraftNoteColorDropdown';
import { resolveTaskBarDraftSaveAction } from './taskBarDraftSave';

interface TaskBarDraftSaveButtonProps {
  noteEditor?: {
    color?: StickyNoteColor;
    showDisabledSave?: boolean;
    value: string;
    onCancel?: () => void;
    onColorChange?: (color: StickyNoteColor) => void;
    onSubmit?: () => void;
  };
}

const DRAFT_ACTION_BUTTON_CLASS =
  '!h-6 !w-6 !min-h-0 !min-w-0 !justify-center !p-0 shadow-sm transition-colors duration-200 focus-visible:outline-none';

function preventDraftBlur(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function handleDraftActionClick(event: MouseEvent, run?: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  run?.();
}

export function TaskBarDraftSaveButton({ noteEditor }: TaskBarDraftSaveButtonProps) {
  const { t } = useI18n();
  const imageDraft = useTaskCardSwimlaneImageDraft();
  const diagramDraft = useTaskCardSwimlaneDiagramDraft();
  const action = resolveTaskBarDraftSaveAction({
    diagramDraft,
    imageDraft,
    noteEditor,
  });
  if (!action) {
    return null;
  }
  const noteColor = noteEditor?.color;
  const onNoteColorChange = noteEditor?.onColorChange;
  const showSave = !action.disabled || Boolean(action.showDisabledSave);
  return (
    <div
      className="pointer-events-auto absolute right-0 top-full mt-1 flex items-center gap-1"
      data-swimlane-draft-save=""
      style={{ zIndex: ZIndex.stickyElevated }}
      onMouseDown={preventDraftBlur}
    >
      {noteColor && onNoteColorChange ? (
        <TaskBarDraftNoteColorDropdown value={noteColor} onChange={onNoteColorChange} />
      ) : null}
      {showSave ? (
        <Button
          aria-label={t('common.confirm')}
          className={`${DRAFT_ACTION_BUTTON_CLASS} text-green-700/90 dark:text-green-400/90 hover:!border-green-600/25 hover:!bg-green-500/[0.12] dark:hover:!border-green-400/30 dark:hover:!bg-green-400/[0.12]`}
          disabled={action.disabled}
          title={t('common.confirm')}
          type="button"
          variant="outline"
          onClick={(event) => handleDraftActionClick(event, action.disabled ? undefined : action.onSave)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="check" />
        </Button>
      ) : null}
      {action.onCancel ? (
        <Button
          aria-label={t('common.cancel')}
          className={`${DRAFT_ACTION_BUTTON_CLASS} text-red-600/90 dark:text-red-400/90 hover:!border-red-600/25 hover:!bg-red-500/[0.1] dark:hover:!border-red-400/30 dark:hover:!bg-red-400/[0.1]`}
          title={t('common.cancel')}
          type="button"
          variant="outline"
          onClick={(event) => handleDraftActionClick(event, action.onCancel)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </Button>
      ) : null}
    </div>
  );
}
