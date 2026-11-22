'use client';

import { observer } from 'mobx-react-lite';

import { useI18n } from '@/contexts/LanguageContext';
import { TaskBarNoteFocusEditor } from '@/features/task/components/TaskBar/TaskBarNoteFocusEditor';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';

/** Заметка, развёрнутая в режим фокуса: выезжает из своего листа на доске и возвращается в него. */
export const QuarterlyPlanNoteFocus = observer(function QuarterlyPlanNoteFocus() {
  const { t } = useI18n();
  const { notes } = useQuarterlyPlanBoard();
  const { memberById } = useQuarterPlanView();
  const { editing } = notes;
  if (!editing?.expanded) return null;
  return (
    <TaskBarNoteFocusEditor
      developers={[...memberById.values()]}
      editor={{
        color: editing.color,
        placeholder: t('comments.placeholder'),
        value: notes.focusValue,
        onCancel: notes.cancel,
        onChange: notes.setFocusValue,
        onColorChange: notes.setColor,
        onSubmit: () => notes.submit(notes.focusValue),
      }}
      getAnchor={() => document.querySelector<HTMLElement>(`[data-quarter-note="${editing.noteId}"]`)}
      onCollapse={notes.collapse}
    />
  );
});
