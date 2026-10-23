'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { MouseEvent } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS,
  CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS,
  CARD_FLOATING_TOOLBAR_NEUTRAL_BUTTON_CLASS,
  CardFloatingToolbar,
  handleCardFloatingToolbarActionClick,
} from '@/features/context-menu/components/CardFloatingToolbar';
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
  /** Развернуть заметку в режим фокуса по центру экрана. */
  onNoteExpand?: () => void;
}

export function TaskBarDraftSaveButton({ noteEditor, onNoteExpand }: TaskBarDraftSaveButtonProps) {
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
    <CardFloatingToolbar data-swimlane-draft-save="">
      {noteColor && onNoteColorChange ? (
        <TaskBarDraftNoteColorDropdown value={noteColor} onChange={onNoteColorChange} />
      ) : null}
      {noteEditor && onNoteExpand ? (
        <Button
          aria-label={t('sprintPlanner.swimlane.placementToolbar.noteExpand')}
          className={CARD_FLOATING_TOOLBAR_NEUTRAL_BUTTON_CLASS}
          title={t('sprintPlanner.swimlane.placementToolbar.noteExpand')}
          type="button"
          variant="ghost"
          onClick={(event: MouseEvent) => handleCardFloatingToolbarActionClick(event, onNoteExpand)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="maximize" />
        </Button>
      ) : null}
      {showSave ? (
        <Button
          aria-label={t('common.confirm')}
          className={CARD_FLOATING_TOOLBAR_CONFIRM_BUTTON_CLASS}
          disabled={action.disabled}
          title={t('common.confirm')}
          type="button"
          variant="ghost"
          onClick={(event: MouseEvent) =>
            handleCardFloatingToolbarActionClick(event, action.disabled ? undefined : action.onSave)
          }
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="check" />
        </Button>
      ) : null}
      {action.onCancel ? (
        <Button
          aria-label={t('common.cancel')}
          className={CARD_FLOATING_TOOLBAR_CANCEL_BUTTON_CLASS}
          title={t('common.cancel')}
          type="button"
          variant="ghost"
          onClick={(event: MouseEvent) =>
            handleCardFloatingToolbarActionClick(event, action.onCancel)
          }
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Icon className="h-3.5 w-3.5" name="x" />
        </Button>
      ) : null}
    </CardFloatingToolbar>
  );
}
