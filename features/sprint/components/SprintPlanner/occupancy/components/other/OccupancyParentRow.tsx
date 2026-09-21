'use client';

import { useI18n } from '@/contexts/LanguageContext';
import { QUARTERLY_STATUS_COLUMN_WIDTH_PX } from '@/features/quarterly-planning-v2/components/planner/quarterlyPlannerLayout';
import { QuarterlyPlannerTaskStatusCell } from '@/features/quarterly-planning-v2/components/planner/QuarterlyPlannerTaskStatusCell';
import { isNameInSprintGoals } from '@/features/sprint/utils/goalNamesFromChecklist';
import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';

import { OccupancyParentRowTaskCell } from './OccupancyParentRowTaskCell';

const OCCUPANCY_DAY_ROW_HEIGHT = 40;

interface OccupancyParentRowProps {
  /** Количество колонок таймлайна (по умолчанию 10 — один спринт) */
  colSpan?: number;
  dragHandle: { attributes: object; listeners: object | undefined } | null;
  goalStoryEpicNames: Set<string>;
  isCollapsed: boolean;
  /** Тип родительской задачи (epic, story и т.д.) для иконки */
  issueType?: string;
  /** Отдельные колонки «задача» и «статус» */
  quarterlySplitTaskColumns?: boolean;
  row: { id: string; display: string; key?: string };
  status?: string;
  taskColumnWidth: number;
  /** Клик по кнопке создания задачи в рамках этой стори (если row.key задан) */
  onCreateTaskForParent?: (row: { id: string; display: string; key?: string }) => void;
  onToggle: (parentId: string) => void;
}

function OccupancyParentRow({
  colSpan = 10,
  dragHandle,
  goalStoryEpicNames,
  isCollapsed,
  issueType,
  quarterlySplitTaskColumns = false,
  row,
  status,
  taskColumnWidth,
  onToggle,
  onCreateTaskForParent,
}: OccupancyParentRowProps) {
  const { t } = useI18n();
  const displayLabel =
    row.display === TASK_GROUP_KEY_NO_PARENT ? t('task.grouping.noParent') : row.display;
  const isInGoals = isNameInSprintGoals(row.display, goalStoryEpicNames);

  return (
    <>
      <OccupancyParentRowTaskCell
        displayLabel={displayLabel}
        dragHandle={dragHandle}
        isCollapsed={isCollapsed}
        isInGoals={isInGoals}
        issueType={issueType}
        quarterlySplitTaskColumns={quarterlySplitTaskColumns}
        row={row}
        status={status}
        t={t}
        taskColumnWidth={taskColumnWidth}
        onCreateTaskForParent={onCreateTaskForParent}
        onToggle={onToggle}
      />
      {quarterlySplitTaskColumns ? (
        <QuarterlyPlannerTaskStatusCell
          className="bg-violet-50 dark:bg-slate-700"
          rowHeightPx={40}
          status={status}
          statusColumnWidth={QUARTERLY_STATUS_COLUMN_WIDTH_PX}
          taskColumnWidth={taskColumnWidth}
        />
      ) : null}
      <td
        className="sticky z-10 bg-violet-50 dark:bg-slate-700 p-0 align-middle relative overflow-hidden"
        colSpan={colSpan}
        style={{
          height: 40,
          maxHeight: 40,
          boxSizing: 'border-box',
          top: OCCUPANCY_DAY_ROW_HEIGHT,
        }}
      >
        <div
          className="absolute left-0 right-0 top-0 h-px bg-gray-200 dark:bg-slate-600 pointer-events-none"
          style={{ zIndex: 61 }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 h-px bg-gray-200 dark:bg-slate-600 pointer-events-none"
          style={{ zIndex: 11 }}
        />
      </td>
    </>
  );
}

export { OccupancyParentRow };
