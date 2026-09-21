'use client';


import { QUARTERLY_WEEK_CELL_TARGET_OUTLINE_CLASS } from '../../../utils/quarterlyPlannerCellMenuAnchor';

import { QuarterlyPlannerWeekAddCellIcon } from './QuarterlyPlannerWeekAddCellIcon';

function quarterlyWeekAddCellShellClass(
  showWeekDividers: boolean,
  highlighted: boolean
): string {
  const cellShellClass = showWeekDividers
    ? 'relative flex flex-1 min-w-0 border-r border-gray-200 dark:border-gray-600 last:border-r-0 pointer-events-none'
    : 'relative flex flex-1 min-w-0 pointer-events-none';

  return highlighted
    ? `${cellShellClass} ${QUARTERLY_WEEK_CELL_TARGET_OUTLINE_CLASS}`
    : cellShellClass;
}

/** add — «+» по центру на hover; edit — карандаш в углу на hover. */
export type QuarterlyPlannerWeekAddCellVariant = 'add' | 'edit';

interface QuarterlyPlannerWeekAddCellProps {
  addable: boolean;
  highlighted?: boolean;
  /** Вертикальные линии между неделями (в строке плана — выключено). */
  showWeekDividers?: boolean;
  title?: string;
  variant?: QuarterlyPlannerWeekAddCellVariant;
  widthStyle: { minWidth: number | undefined; width: number | string };
  onAddClick: (e: React.MouseEvent<HTMLElement>) => void;
}

/** Недельная ячейка: подсказка добавления/редактирования по hover. */
export function QuarterlyPlannerWeekAddCell({
  addable,
  highlighted = false,
  onAddClick,
  title,
  variant = 'add',
  showWeekDividers = true,
  widthStyle,
}: QuarterlyPlannerWeekAddCellProps) {
  const shellClass = quarterlyWeekAddCellShellClass(showWeekDividers, highlighted);

  if (!addable) {
    return <div className={shellClass} style={widthStyle} />;
  }

  return (
    <div className={`group/add-cell ${shellClass}`} style={widthStyle}>
      <button
        className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0 pointer-events-auto hover:bg-blue-500/[0.06] dark:hover:bg-blue-400/[0.08]"
        title={title}
        type="button"
        onClick={onAddClick}
      />
      <QuarterlyPlannerWeekAddCellIcon variant={variant} />
    </div>
  );
}
