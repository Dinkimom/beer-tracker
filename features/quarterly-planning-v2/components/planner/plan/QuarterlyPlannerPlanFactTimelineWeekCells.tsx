'use client';

import type { StoryEventsByStory } from '../../../types';

import { useI18n } from '@/contexts/LanguageContext';

import { getStoryEventForWeek } from '../../../utils/storyEventsMap';

import { QuarterlyPlannerPlanWeekCell } from './QuarterlyPlannerPlanWeekCell';

interface QuarterlyPlannerPlanFactTimelineWeekCellsProps {
  activeMenuWeekIndex: number | null;
  canAddAnyPhase: boolean;
  canEditFact: boolean;
  cellWidthStyle: { minWidth: number | undefined; width: number | string };
  isEditingPlan: boolean;
  storyEventsByStory: StoryEventsByStory;
  storyKey: string;
  weekCount: number;
  handleAddPhaseClick: (weekIndex: number, anchorEl: HTMLElement) => void;
  isWeekOccupiedByPlan: (weekIndex: number) => boolean;
  openEventMenu: (weekIndex: number, anchorEl: HTMLElement) => void;
}

export function QuarterlyPlannerPlanFactTimelineWeekCells({
  activeMenuWeekIndex,
  canAddAnyPhase,
  canEditFact,
  cellWidthStyle,
  handleAddPhaseClick,
  isEditingPlan,
  isWeekOccupiedByPlan,
  openEventMenu,
  storyEventsByStory,
  storyKey,
  weekCount,
}: QuarterlyPlannerPlanFactTimelineWeekCellsProps) {
  const { t } = useI18n();

  return (
    <div className="absolute inset-0 z-20 flex pointer-events-none">
      {Array.from({ length: weekCount }, (_, weekIndex) => (
        <QuarterlyPlannerPlanWeekCell
          key={weekIndex}
          activeMenuWeekIndex={activeMenuWeekIndex}
          canAddAnyPhase={canAddAnyPhase}
          canEditFact={canEditFact}
          cellWidthStyle={cellWidthStyle}
          hasEvent={
            getStoryEventForWeek(storyEventsByStory, storyKey, weekIndex) != null
          }
          isEditingPlan={isEditingPlan}
          isWeekOccupiedByPlan={isWeekOccupiedByPlan}
          t={t}
          weekIndex={weekIndex}
          onAddPhaseClick={handleAddPhaseClick}
          onOpenEventMenu={openEventMenu}
        />
      ))}
    </div>
  );
}
