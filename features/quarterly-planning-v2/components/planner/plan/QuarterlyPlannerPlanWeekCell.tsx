'use client';

import { quarterlyPlannerWeekAddCellTitle } from './quarterlyPlannerAddEventMenuHelpers';
import { QuarterlyPlannerWeekAddCell } from './QuarterlyPlannerWeekAddCell';

type Translate = (key: string) => string;

interface QuarterlyPlannerPlanWeekCellProps {
  activeMenuWeekIndex: number | null;
  canAddAnyPhase: boolean;
  canEditFact: boolean;
  cellWidthStyle: { minWidth: number | undefined; width: number | string };
  hasEvent: boolean;
  isEditingPlan: boolean;
  t: Translate;
  weekIndex: number;
  isWeekOccupiedByPlan: (weekIndex: number) => boolean;
  onAddPhaseClick: (weekIndex: number, anchorEl: HTMLElement) => void;
  onOpenEventMenu: (weekIndex: number, anchorEl: HTMLElement) => void;
}

export function QuarterlyPlannerPlanWeekCell({
  weekIndex,
  isEditingPlan,
  isWeekOccupiedByPlan,
  canAddAnyPhase,
  activeMenuWeekIndex,
  cellWidthStyle,
  t,
  onAddPhaseClick,
  canEditFact,
  hasEvent,
  onOpenEventMenu,
}: QuarterlyPlannerPlanWeekCellProps) {
  if (isEditingPlan) {
    const addable = !isWeekOccupiedByPlan(weekIndex) && canAddAnyPhase;
    return (
      <QuarterlyPlannerWeekAddCell
        key={weekIndex}
        addable={addable}
        highlighted={activeMenuWeekIndex === weekIndex}
        showWeekDividers={false}
        title={addable ? t('planning.quarterlyV2.addPhaseOnCellTitle') : undefined}
        widthStyle={cellWidthStyle}
        onAddClick={(e) => {
          e.stopPropagation();
          onAddPhaseClick(weekIndex, e.currentTarget);
        }}
      />
    );
  }

  return (
    <QuarterlyPlannerWeekAddCell
      key={weekIndex}
      addable={canEditFact}
      highlighted={activeMenuWeekIndex === weekIndex}
      showWeekDividers={false}
      title={quarterlyPlannerWeekAddCellTitle(canEditFact, hasEvent, t)}
      variant={hasEvent ? 'edit' : 'add'}
      widthStyle={cellWidthStyle}
      onAddClick={(e) => {
        e.stopPropagation();
        onOpenEventMenu(weekIndex, e.currentTarget);
      }}
    />
  );
}
