/** Обводка целевой недельной ячейки, пока открыт попап добавления. */
export const QUARTERLY_WEEK_CELL_TARGET_OUTLINE_CLASS =
  'ring-2 ring-inset ring-blue-500/80 dark:ring-blue-400/90';

export interface QuarterlyPlannerCellMenuAnchor {
  anchorBottom: number;
  anchorRight: number;
}

export function readCellMenuAnchor(element: HTMLElement): QuarterlyPlannerCellMenuAnchor {
  const rect = element.getBoundingClientRect();
  return { anchorRight: rect.right, anchorBottom: rect.bottom };
}
