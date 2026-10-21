'use client';

import type { Task, TaskPosition } from '@/types';
import type { CSSProperties } from 'react';

import { observer } from 'mobx-react-lite';

import { ZIndex, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { planAnchorCellRanges, resolvePlanAnchorDiff } from '@/features/swimlane/utils/planAnchorShift';
import { buildSwimlaneTaskBarHorizontalStyle } from '@/features/task/components/TaskBar/taskBarHelpers';
import { useRootStore } from '@/lib/layers';

interface TaskLayerPlanAnchorMarksProps {
  /** Задача под курсором: показываем, где она стояла по плану на старте работы. */
  focused: boolean;
  position: TaskPosition;
  rowBandStyle: Pick<CSSProperties, 'height' | 'top'>;
  task: Task;
  timelineTotalParts: number;
}

/**
 * Исходное положение задачи по плану на старте работы — контур поверх карточек при наведении.
 * Контур смонтирован всегда и проявляется/гаснет переходом opacity, чтобы появление было плавным.
 * Только если начало сдвинулось: иначе рост стоимости и так виден по штриховке на карточке,
 * а снятую стоимость отдельно не показываем — её обычно снимают на ритуале и сразу занимают место.
 * Остальные карточки в этот момент приглушены (SwimlanesSection), контур не теряется в плотной строке.
 * Сам факт переноса виден всегда — значок в левом верхнем углу карточки (TaskBarPlanMovedBadge).
 */
export const TaskLayerPlanAnchorMarks = observer(function TaskLayerPlanAnchorMarks({
  focused,
  position,
  rowBandStyle,
  task,
  timelineTotalParts,
}: TaskLayerPlanAnchorMarksProps) {
  const { t } = useI18n();
  const { taskPositions: positionsStore } = useRootStore();
  const partsPerDay = getPartsPerDay();
  const anchor = positionsStore.planAnchors.get(task.id);
  const diff = resolvePlanAnchorDiff({ anchor, partsPerDay, position, task });
  if (!anchor || !diff || diff.startShiftCells === 0 || timelineTotalParts <= 0) return null;

  const ghostLabel = t('sprintPlanner.swimlane.planAnchor');
  return planAnchorCellRanges(anchor, partsPerDay).map((range, index) => (
    <div
      key={`${range.start}-${range.duration}`}
      aria-hidden={!focused}
      aria-label={ghostLabel}
      className={`pointer-events-none absolute rounded-lg border-2 border-dashed border-amber-500 bg-amber-400/10 motion-reduce:transition-none dark:border-amber-400 ${
        focused
          ? 'scale-100 opacity-100 [transition:opacity_200ms_ease-out,scale_200ms_ease-out]'
          : // Гаснет только прозрачность; масштаб сбрасывается мгновенно, когда контур уже невидим.
            'scale-[0.98] opacity-0 [transition:opacity_200ms_ease-out,scale_0s_linear_200ms]'
      }`}
      role="img"
      style={{
        ...rowBandStyle,
        ...buildSwimlaneTaskBarHorizontalStyle({
          durationCells: range.duration,
          startCell: range.start,
          timelineTotalParts,
        }),
        zIndex: ZIndex.stickyInContent + 1,
      }}
    >
      {index === 0 && (
        <span className="absolute left-1.5 top-1 whitespace-nowrap rounded bg-amber-500 px-1 py-0.5 text-[10px] font-medium leading-none text-white dark:bg-amber-400 dark:text-gray-900">
          {ghostLabel}
        </span>
      )}
    </div>
  ));
});
