import type { Comment, Task, TaskParent } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { upsertSprintTaskInQueries } from '@/features/task/hooks/useTasks';

import {
  submitAttachedFeatureLane,
  submitConvertedFeatureLaneDraft,
  submitCreatedFeatureLane,
  submitExistingFeatureLaneDraft,
} from './submitConvertedFeatureLaneDraft';

export function useFeatureLaneDraftConvert(input: {
  comments: Comment[];
  selectedSprintId: number | null;
  tasks: Task[];
  onCommentParentChange?: (commentId: string, parent: TaskParent | null) => void;
  onLocalTaskParentChange?: (taskId: string, parent: TaskParent | null) => void;
  onPinTrackerRow: (next: { id: string; name: string }) => void;
  onReplaceDraftRow: (rowId: string, next: { id: string; name: string }) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    comments,
    onCommentParentChange,
    onLocalTaskParentChange,
    onPinTrackerRow,
    onReplaceDraftRow,
    selectedSprintId,
    tasks,
  } = input;

  const convertRow = useCallback(
    async (
      rowId: string,
      fields: { issueType: string; queueKey: string; summary: string }
    ): Promise<boolean> => {
      if (!selectedSprintId || !onCommentParentChange) {
        return false;
      }
      setIsSubmitting(true);
      try {
        const result = await submitConvertedFeatureLaneDraft({
          comments,
          createFailedMessage: t('sprintPlanner.featureLanes.convertFailed'),
          issueType: fields.issueType,
          missingQueueMessage: t('task.mutations.tasksReloadFailed'),
          onCommentParentChange,
          onCreatedTask: (task) => upsertSprintTaskInQueries(queryClient, selectedSprintId, task),
          onLocalTaskParentChange: onLocalTaskParentChange ?? (() => undefined),
          onReplaceDraftRow,
          parentUpdateFailedMessage: t('sprintPlanner.contextMenu.parentUpdateFailed'),
          queueKey: fields.queueKey,
          rowId,
          selectedSprintId,
          summary: fields.summary,
          tasks,
        });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(t('sprintPlanner.featureLanes.convertSuccess', { key: result.issueKey }));
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      comments,
      onCommentParentChange,
      onLocalTaskParentChange,
      onReplaceDraftRow,
      queryClient,
      selectedSprintId,
      t,
      tasks,
    ]
  );

  const createRow = useCallback(
    async (fields: {
      issueType: string;
      queueKey: string;
      summary: string;
    }): Promise<boolean> => {
      if (!selectedSprintId) {
        return false;
      }
      setIsSubmitting(true);
      try {
        const result = await submitCreatedFeatureLane({
          createFailedMessage: t('sprintPlanner.featureLanes.convertFailed'),
          issueType: fields.issueType,
          missingQueueMessage: t('task.mutations.tasksReloadFailed'),
          onCreatedTask: (task) => upsertSprintTaskInQueries(queryClient, selectedSprintId, task),
          onPinTrackerRow,
          queueKey: fields.queueKey,
          selectedSprintId,
          summary: fields.summary,
        });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(t('sprintPlanner.featureLanes.convertSuccess', { key: result.issueKey }));
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onPinTrackerRow, queryClient, selectedSprintId, t]
  );

  const attachExisting = useCallback((selectedTask: Task): Promise<boolean> => {
    const result = submitAttachedFeatureLane({
      emptyKeyMessage: t('sprintPlanner.featureLanes.convertExistingFailed'),
      onPinTrackerRow,
      selectedTask,
    });
    if (!result.ok) {
      toast.error(result.error);
      return Promise.resolve(false);
    }
    toast.success(
      t('sprintPlanner.featureLanes.convertExistingSuccess', { key: result.issueKey })
    );
    return Promise.resolve(true);
  }, [onPinTrackerRow, t]);

  const convertExisting = useCallback(
    async (rowId: string, selectedTask: Task): Promise<boolean> => {
      if (!selectedSprintId || !onCommentParentChange) {
        return false;
      }
      setIsSubmitting(true);
      try {
        const result = await submitExistingFeatureLaneDraft({
          comments,
          onCommentParentChange,
          onLocalTaskParentChange: onLocalTaskParentChange ?? (() => undefined),
          onReplaceDraftRow,
          parentUpdateFailedMessage: t('sprintPlanner.featureLanes.convertExistingFailed'),
          rowId,
          selectedTask,
          sprintId: selectedSprintId,
          tasks,
        });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        toast.success(
          t('sprintPlanner.featureLanes.convertExistingSuccess', { key: result.issueKey })
        );
        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      comments,
      onCommentParentChange,
      onLocalTaskParentChange,
      onReplaceDraftRow,
      selectedSprintId,
      t,
      tasks,
    ]
  );

  return {
    attachExisting,
    convertExisting,
    convertRow,
    createRow,
    isSubmitting,
  };
}
