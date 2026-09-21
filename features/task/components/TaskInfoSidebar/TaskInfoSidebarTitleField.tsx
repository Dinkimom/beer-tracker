'use client';

import type { Task } from '@/types';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { CopyFeedbackGlyph } from '@/components/CopyFeedbackGlyph';
import { useI18n } from '@/contexts/LanguageContext';
import { TASK_INFO_ICON_BUTTON_CLASS } from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarIconClasses';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { updateIssueFields } from '@/lib/beerTrackerApi';

/** Padding рамки; `-ml-2.5` держит текст на линии контента без прилипания к кнопке копирования. */
const TITLE_PAD_CLASS = 'px-2.5 py-1.5';

const TITLE_TEXT_CLASS =
  'text-left text-2xl font-semibold leading-snug text-gray-900 dark:text-gray-100';

const TITLE_DISPLAY_CLASS = `inline-block w-fit max-w-full -ml-2.5 cursor-text rounded-lg border border-transparent ${TITLE_PAD_CLASS} ${TITLE_TEXT_CLASS} transition-colors hover:border-gray-200 disabled:cursor-default disabled:hover:border-transparent dark:hover:border-gray-600 dark:disabled:hover:border-transparent`;

const TITLE_EDIT_CLASS = `col-start-1 row-start-1 h-full w-full resize-none overflow-hidden rounded-lg border border-gray-300 bg-white ${TITLE_PAD_CLASS} ${TITLE_TEXT_CLASS} outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:focus:border-blue-400`;

const TITLE_MIRROR_CLASS = `invisible col-start-1 row-start-1 whitespace-pre-wrap break-words ${TITLE_PAD_CLASS} ${TITLE_TEXT_CLASS}`;

interface TaskInfoSidebarTitleFieldProps {
  task: Task;
  onFieldsSaved?: (fields: { description?: string; name?: string }) => void;
}

export function TaskInfoSidebarTitleField({ task, onFieldsSaved }: TaskInfoSidebarTitleFieldProps) {
  const { t } = useI18n();
  const titleCopyFeedback = useCopyFeedback();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(task.name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.focus();
    el.select();
  }, [isEditing]);

  const canEdit = !task.isLocalTask && !isSaving;

  const startEdit = () => {
    if (!canEdit) {
      return;
    }
    setDraft(task.name);
    setIsEditing(true);
  };

  const copyTitle = () => {
    titleCopyFeedback.copy(task.name).catch(() => undefined);
  };

  const cancelEdit = () => {
    setDraft(task.name);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const nextName = draft.trim();
    if (!nextName) {
      cancelEdit();
      return;
    }
    if (nextName === task.name.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const ok = await updateIssueFields(getTaskTrackerDisplayKey(task), { summary: nextName });
    setIsSaving(false);
    if (!ok) {
      toast.error(t('sprintPlanner.taskInfo.saveTitleFailed'));
      return;
    }
    onFieldsSaved?.({ name: nextName });
    setIsEditing(false);
  };

  return (
    <div className="flex max-w-full items-start gap-2">
      {isEditing ? (
        <div className="inline-grid max-w-full min-w-0 -ml-2.5">
          <span aria-hidden className={TITLE_MIRROR_CLASS}>
            {draft || ' '}
          </span>
          <textarea
            ref={textareaRef}
            aria-label={t('sprintPlanner.taskInfo.editTitle')}
            className={TITLE_EDIT_CLASS}
            disabled={isSaving}
            rows={1}
            value={draft}
            onBlur={() => {
              void saveEdit();
            }}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelEdit();
                return;
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void saveEdit();
              }
            }}
          />
        </div>
      ) : (
        <button
          className={TITLE_DISPLAY_CLASS}
          disabled={!canEdit}
          type="button"
          onClick={startEdit}
        >
          {task.name}
        </button>
      )}
      <button
        aria-label={t('sprintPlanner.taskInfo.copyTitle')}
        className={`${TASK_INFO_ICON_BUTTON_CLASS} mt-1.5 shrink-0`}
        title={t('sprintPlanner.taskInfo.copyTitle')}
        type="button"
        onClick={copyTitle}
      >
        <CopyFeedbackGlyph copied={titleCopyFeedback.copied} idleName="copy" />
      </button>
    </div>
  );
}
