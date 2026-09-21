'use client';

import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { FeatureLaneRowTitleParts } from '@/features/swimlane/utils/featureSwimlaneRows';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface FeatureLaneConvertNewFields {
  issueType: string;
  queueKey: string;
  summary: string;
}

const FeatureLaneShowAssigneeAvatarContext = createContext(false);

interface FeatureLaneColumnUi {
  convertBoardId: number | null;
  convertIsSubmitting: boolean;
  convertQueueOptions: QuickAddQueueOption[];
  isFeatureLane: boolean;
  moveFeatureRow: ((rowId: string, sprintId: number) => Promise<void>) | null;
  onAddFeatureRow: ((name: string) => void) | null;
  onAddFeatureRowFromExisting: ((task: Task) => Promise<boolean>) | null;
  onAddFeatureRowFromNew: ((fields: FeatureLaneConvertNewFields) => Promise<boolean>) | null;
  onConvertFeatureRow: ((rowId: string, fields: FeatureLaneConvertNewFields) => Promise<boolean>) | null;
  onConvertFeatureRowExisting: ((rowId: string, task: Task) => Promise<boolean>) | null;
  removeFeatureRow: ((rowId: string) => void) | null;
  renameFeatureRow: ((rowId: string, name: string) => void) | null;
  rowTitleById: ReadonlyMap<string, FeatureLaneRowTitleParts>;
  selectedSprintId: number | null;
  sprints: readonly SprintListItem[];
}

const emptyRowTitles = new Map<string, FeatureLaneRowTitleParts>();
const emptyQueueOptions: QuickAddQueueOption[] = [];
const emptySprints: SprintListItem[] = [];

const FeatureLaneColumnUiContext = createContext<FeatureLaneColumnUi>({
  convertBoardId: null,
  convertIsSubmitting: false,
  convertQueueOptions: emptyQueueOptions,
  isFeatureLane: false,
  moveFeatureRow: null,
  onAddFeatureRow: null,
  onAddFeatureRowFromExisting: null,
  onAddFeatureRowFromNew: null,
  onConvertFeatureRow: null,
  onConvertFeatureRowExisting: null,
  removeFeatureRow: null,
  renameFeatureRow: null,
  rowTitleById: emptyRowTitles,
  selectedSprintId: null,
  sprints: emptySprints,
});

/** Включает UI режима «по фичам»: аватар на карточке, заголовок колонки, ссылки в строках. */
export function FeatureLaneCardUiProvider({
  children,
  convertBoardId,
  convertIsSubmitting,
  convertQueueOptions,
  moveFeatureRow,
  onAddFeatureRow,
  onAddFeatureRowFromExisting,
  onAddFeatureRowFromNew,
  onConvertFeatureRow,
  onConvertFeatureRowExisting,
  removeFeatureRow,
  renameFeatureRow,
  rowTitleById,
  selectedSprintId,
  sprints,
}: {
  children: ReactNode;
  convertBoardId: number | null;
  convertIsSubmitting: boolean;
  convertQueueOptions: QuickAddQueueOption[];
  moveFeatureRow: (rowId: string, sprintId: number) => Promise<void>;
  onAddFeatureRow: (name: string) => void;
  onAddFeatureRowFromExisting: (task: Task) => Promise<boolean>;
  onAddFeatureRowFromNew: (fields: FeatureLaneConvertNewFields) => Promise<boolean>;
  onConvertFeatureRow: (rowId: string, fields: FeatureLaneConvertNewFields) => Promise<boolean>;
  onConvertFeatureRowExisting: (rowId: string, task: Task) => Promise<boolean>;
  removeFeatureRow: (rowId: string) => void;
  renameFeatureRow: (rowId: string, name: string) => void;
  rowTitleById: ReadonlyMap<string, FeatureLaneRowTitleParts>;
  selectedSprintId: number | null;
  sprints: readonly SprintListItem[];
}) {
  const columnUi = useMemo(
    () => ({
      convertBoardId,
      convertIsSubmitting,
      convertQueueOptions,
      isFeatureLane: true,
      moveFeatureRow,
      onAddFeatureRow,
      onAddFeatureRowFromExisting,
      onAddFeatureRowFromNew,
      onConvertFeatureRow,
      onConvertFeatureRowExisting,
      removeFeatureRow,
      renameFeatureRow,
      rowTitleById,
      selectedSprintId,
      sprints,
    }),
    [
      convertBoardId,
      convertIsSubmitting,
      convertQueueOptions,
      moveFeatureRow,
      onAddFeatureRow,
      onAddFeatureRowFromExisting,
      onAddFeatureRowFromNew,
      onConvertFeatureRow,
      onConvertFeatureRowExisting,
      removeFeatureRow,
      renameFeatureRow,
      rowTitleById,
      selectedSprintId,
      sprints,
    ]
  );
  return (
    <FeatureLaneShowAssigneeAvatarContext.Provider value={true}>
      <FeatureLaneColumnUiContext.Provider value={columnUi}>
        {children}
      </FeatureLaneColumnUiContext.Provider>
    </FeatureLaneShowAssigneeAvatarContext.Provider>
  );
}

export function useFeatureLaneShowAssigneeAvatar(): boolean {
  return useContext(FeatureLaneShowAssigneeAvatarContext);
}

export function useFeatureLaneColumnUi(): FeatureLaneColumnUi {
  return useContext(FeatureLaneColumnUiContext);
}
