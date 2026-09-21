'use client';

import type { TaskCardSwimlaneDiagramDraft } from './TaskCardSwimlaneDiagramDraftContext';
import type { KeyboardEvent } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import { isQuickAddSubmitKey } from '@/features/task/components/TaskBar/components/quickAddMenu/quickAddMenuKeyboard';
import { getDiagramCardWellClass } from '@/features/task/utils/photoCardSurface';

const CAPTION_TEXT_CLASS =
  'min-w-0 flex-1 truncate bg-transparent text-center font-sans text-[10px] font-medium leading-tight tracking-wide outline-none opacity-90 placeholder:text-current placeholder:opacity-70';

interface TaskCardSwimlaneDiagramDraftEditorProps {
  draft: TaskCardSwimlaneDiagramDraft;
}

export function TaskCardSwimlaneDiagramDraftEditor({
  draft,
}: TaskCardSwimlaneDiagramDraftEditorProps) {
  const { t } = useI18n();
  const namePlaceholder = t('sprintPlanner.swimlane.quickAddMenu.diagramNamePlaceholder');

  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      draft.onCancel();
      return;
    }
    if (isQuickAddSubmitKey(event, true)) {
      event.preventDefault();
      draft.onSubmit();
    }
  };

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col"
      data-swimlane-diagram-draft=""
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div
        className={getDiagramCardWellClass()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      />
      <div className="mt-2 flex min-w-0 shrink-0 items-center justify-center gap-1.5 px-0.5">
        <ExcalidrawMark className="h-3.5 w-3.5 shrink-0" />
        <input
          aria-label={namePlaceholder}
          className={CAPTION_TEXT_CLASS}
          disabled={draft.isSubmitting}
          placeholder={namePlaceholder}
          spellCheck={false}
          value={draft.caption}
          onChange={(event) => draft.onCaptionChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        />
      </div>
    </div>
  );
}
