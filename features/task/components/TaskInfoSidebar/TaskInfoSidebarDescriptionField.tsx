'use client';

import type { DescriptionEditorMode } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionToolbar';
import type { Task } from '@/types';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  TaskInfoSidebarDescriptionEditor,
  type TaskInfoSidebarDescriptionEditorHandle,
} from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionEditor';
import {
  TASK_INFO_ICON_BUTTON_CLASS,
  TASK_INFO_ICON_SVG_CLASS,
} from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarIconClasses';
import {
  normalizeEditorMarkdown,
  trackerDescriptionToEditorMarkdown,
} from '@/features/task/components/TaskInfoSidebar/trackerDescriptionParse';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { updateIssueFields } from '@/lib/beerTrackerApi';

const DESCRIPTION_VIEW_CLASS =
  'mt-8 w-full rounded-lg border border-transparent px-0 py-0';

/** Та же поверхность, что у сайдбара (`dark:bg-gray-800`), чтобы редактор не выбивался островом. */
const DESCRIPTION_EDIT_CLASS =
  'mt-8 w-full overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-gray-600';

interface TaskInfoSidebarDescriptionFieldProps {
  isDescriptionLoading?: boolean;
  task: Task;
  onFieldsSaved?: (fields: { description?: string; name?: string }) => void;
}

export function TaskInfoSidebarDescriptionField({
  isDescriptionLoading = false,
  task,
  onFieldsSaved,
}: TaskInfoSidebarDescriptionFieldProps) {
  const { t } = useI18n();
  const editorRef = useRef<TaskInfoSidebarDescriptionEditorHandle>(null);
  const isSavingRef = useRef(false);
  const baselineMarkdownRef = useRef(trackerDescriptionToEditorMarkdown(task.description));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorMode, setEditorMode] = useState<DescriptionEditorMode>('wysiwyg');

  const canEdit = !task.isLocalTask && !isSaving && !isDescriptionLoading;
  const contentMarkdown = trackerDescriptionToEditorMarkdown(task.description);

  const startEdit = () => {
    if (!canEdit) {
      return;
    }
    baselineMarkdownRef.current = contentMarkdown;
    setEditorMode('wysiwyg');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    editorRef.current?.setMarkdown(baselineMarkdownRef.current);
    setEditorMode('wysiwyg');
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (isSavingRef.current) {
      return;
    }

    const nextDescription = editorRef.current?.getMarkdown() ?? contentMarkdown;
    if (
      normalizeEditorMarkdown(nextDescription) ===
      normalizeEditorMarkdown(baselineMarkdownRef.current)
    ) {
      setEditorMode('wysiwyg');
      setIsEditing(false);
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    const ok = await updateIssueFields(getTaskTrackerDisplayKey(task), {
      description: nextDescription,
    });
    isSavingRef.current = false;
    setIsSaving(false);
    if (!ok) {
      toast.error(t('sprintPlanner.taskInfo.saveDescriptionFailed'));
      return;
    }

    baselineMarkdownRef.current = nextDescription;
    onFieldsSaved?.({ description: nextDescription });
    setEditorMode('wysiwyg');
    setIsEditing(false);
  };

  if (isDescriptionLoading) {
    return (
      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        {t('sprintPlanner.taskInfo.descriptionLoading')}
      </p>
    );
  }

  return (
    <div className="group relative">
      {canEdit && !isEditing ? (
        <button
          aria-label={t('sprintPlanner.taskInfo.editDescription')}
          className={`${TASK_INFO_ICON_BUTTON_CLASS} absolute right-0 top-8 z-10 bg-transparent opacity-0 group-hover:opacity-100`}
          title={t('sprintPlanner.taskInfo.editDescription')}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            startEdit();
          }}
        >
          <Icon className={TASK_INFO_ICON_SVG_CLASS} name="edit" />
        </button>
      ) : null}
      <div
        className={`${isEditing ? DESCRIPTION_EDIT_CLASS : DESCRIPTION_VIEW_CLASS} ${
          isSaving ? 'opacity-60' : ''
        }`}
      >
        <TaskInfoSidebarDescriptionEditor
          ref={editorRef}
          ariaLabel={t('sprintPlanner.taskInfo.editDescription')}
          contentMarkdown={contentMarkdown}
          editable={isEditing}
          mode={editorMode}
          saving={isSaving}
          onCancel={cancelEdit}
          onModeChange={setEditorMode}
          onSave={() => {
            void saveEdit();
          }}
        />
      </div>
    </div>
  );
}
