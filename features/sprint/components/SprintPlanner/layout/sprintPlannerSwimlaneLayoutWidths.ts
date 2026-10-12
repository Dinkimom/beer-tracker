import { CARD_MARGIN, SWIMLANE_DAY_CARD_WIDTH_PX, WORKING_DAYS } from '@/constants';

/** Макс. ширина одного дня таймлайна в планере (px); совпадает с DaysHeader / SwimlanesSection / Swimlane. */
export const SPRINT_PLANNER_DAY_MAX_WIDTH_PX = SWIMLANE_DAY_CARD_WIDTH_PX + CARD_MARGIN * 2;

export function sprintPlannerMaxTimelineWidthPx(workingDaysCount: number = WORKING_DAYS): number {
  return workingDaysCount * SPRINT_PLANNER_DAY_MAX_WIDTH_PX;
}

/** Выражение ширины области таймлайна без колонки участников: `calc(200vw - …)`. */
export function sprintPlannerFullTimelineWidthExpr(
  participantsColumnWidth: number,
  sidebarEffectiveWidthPx: number
): string {
  return `calc(200vw - ${participantsColumnWidth}px - ${sidebarEffectiveWidthPx}px)`;
}

/** Ширина внутреннего таймлайна в строке свимлейна (ограничение по max px). */
export function sprintPlannerSwimlaneTimelineWidthCss(
  viewMode: 'compact' | 'full',
  participantsColumnWidth: number,
  sidebarEffectiveWidthPx: number,
  workingDaysCount: number = WORKING_DAYS
): string {
  if (viewMode !== 'full') return '100%';
  const full = sprintPlannerFullTimelineWidthExpr(participantsColumnWidth, sidebarEffectiveWidthPx);
  return `min(${full}, ${sprintPlannerMaxTimelineWidthPx(workingDaysCount)}px)`;
}

/** Ширина контента шапки дней: колонка участников + таймлайн. */
export function sprintPlannerDaysHeaderContentWidthCss(
  viewMode: 'compact' | 'full',
  participantsColumnWidth: number,
  sidebarEffectiveWidthPx: number,
  workingDaysCount: number = WORKING_DAYS
): string {
  if (viewMode !== 'full') return '100%';
  const full = sprintPlannerFullTimelineWidthExpr(participantsColumnWidth, sidebarEffectiveWidthPx);
  return `calc(${participantsColumnWidth}px + min(${full}, ${sprintPlannerMaxTimelineWidthPx(workingDaysCount)}px))`;
}

/**
 * Ширина хвоста таймлайна, на который карточка вылезает за последнюю ячейку.
 * null — план внутри сетки, колонку после спринта не растягиваем.
 */
export function sprintPlannerOverflowTimelineWidthCss(
  viewMode: 'compact' | 'full',
  participantsColumnWidth: number,
  sidebarEffectiveWidthPx: number,
  workingDaysCount: number,
  overflowCells: number,
  totalCells: number
): string | null {
  if (viewMode !== 'full' || overflowCells <= 0 || totalCells <= 0) return null;
  const timeline = sprintPlannerSwimlaneTimelineWidthCss(
    viewMode,
    participantsColumnWidth,
    sidebarEffectiveWidthPx,
    workingDaysCount
  );
  return `calc(${overflowCells} * (${timeline}) / ${totalCells})`;
}

/**
 * Ширина строки планера (шапка + свимлейны): не уже viewport, чтобы справа
 * заполнить зону после спринта, когда дней меньше капа по max-width.
 * `overflowWidthCss` добавляет хвост, если карточка вылезла за сетку.
 */
export function sprintPlannerContentRowWidthCss(
  viewMode: 'compact' | 'full',
  participantsColumnWidth: number,
  sidebarEffectiveWidthPx: number,
  workingDaysCount: number = WORKING_DAYS,
  overflowWidthCss: string | null = null
): string {
  if (viewMode !== 'full') return '100%';
  const content = sprintPlannerDaysHeaderContentWidthCss(
    viewMode,
    participantsColumnWidth,
    sidebarEffectiveWidthPx,
    workingDaysCount
  );
  if (!overflowWidthCss) return `max(100%, ${content})`;
  return `max(100%, calc(${content} + ${overflowWidthCss}))`;
}
