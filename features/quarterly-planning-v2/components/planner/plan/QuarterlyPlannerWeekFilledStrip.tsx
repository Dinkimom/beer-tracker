'use client';

import { QuarterlyPlannerTimelineWeekStrip } from './QuarterlyPlannerTimelineWeekStrip';

interface QuarterlyPlannerWeekFilledStripProps {
  fillContainer?: boolean;
  rowHeightPx: number;
  weekColumnWidth: number | undefined;
  weekCount: number;
  getFillClass: (weekIndex: number) => string | null;
}

/** Недельные ячейки с полной заливкой (режим просмотра). */
export function QuarterlyPlannerWeekFilledStrip({
  weekCount,
  weekColumnWidth,
  rowHeightPx,
  fillContainer = false,
  getFillClass,
}: QuarterlyPlannerWeekFilledStripProps) {
  return (
    <QuarterlyPlannerTimelineWeekStrip
      fillContainer={fillContainer}
      rowHeightPx={rowHeightPx}
      weekColumnWidth={weekColumnWidth}
      weekCount={weekCount}
    >
      {(weekIndex) => {
        const fillClass = getFillClass(weekIndex);
        if (!fillClass) return null;
        return <div aria-hidden className={`absolute inset-0 ${fillClass}`} />;
      }}
    </QuarterlyPlannerTimelineWeekStrip>
  );
}
