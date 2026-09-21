'use client';

import type {
  QuarterlyPlanPhaseKind,
  QuarterlyStoryEventKind,
  StoryEventsByStory,
} from '../../../types';
import type { QuarterlyPlannerAddEventMenuState } from './QuarterlyPlannerAddEventMenu';
import type { QuarterlyPlannerAddPhaseMenuState } from './QuarterlyPlannerAddPhaseMenu';
import type { QuarterlyPlannerPhaseDeleteMenuState } from './QuarterlyPlannerPhaseDeleteMenu';

import {
  buildQuarterlyEventPlacementContext,
  buildQuarterlyPlanWeekPositions,
} from '../../../hooks/quarterlyPlannerPlanFactTimelineHelpers';
import { canPickStoryEventKind } from '../../../utils/quarterlyStoryEventPlacement';

import { QuarterlyPlannerAddEventMenu } from './QuarterlyPlannerAddEventMenu';
import { QuarterlyPlannerAddPhaseMenu } from './QuarterlyPlannerAddPhaseMenu';
import { QuarterlyPlannerPhaseDeleteMenu } from './QuarterlyPlannerPhaseDeleteMenu';

interface QuarterlyPlannerPlanFactTimelineMenusProps {
  addPhaseMenu: QuarterlyPlannerAddPhaseMenuState | null;
  canAddDelivery: boolean;
  canAddDiscovery: boolean;
  canEditFact: boolean;
  deleteMenu: QuarterlyPlannerPhaseDeleteMenuState | null;
  storyEventsByStory: StoryEventsByStory;
  storyKey: string;
  visibleEventMenu: QuarterlyPlannerAddEventMenuState | null;
  weekPositions: ReturnType<typeof buildQuarterlyPlanWeekPositions>;
  handleAddPhase: (kind: QuarterlyPlanPhaseKind, weekIndex: number) => void;
  handleDeletePhase: (phaseId: string) => void;
  onStoryEventChange: (weekIndex: number, kind: QuarterlyStoryEventKind | null) => void;
  setAddPhaseMenu: (value: QuarterlyPlannerAddPhaseMenuState | null) => void;
  setDeleteMenu: (value: QuarterlyPlannerPhaseDeleteMenuState | null) => void;
  setEventMenu: (value: QuarterlyPlannerAddEventMenuState | null) => void;
}

export function QuarterlyPlannerPlanFactTimelineMenus({
  addPhaseMenu,
  canAddDelivery,
  canAddDiscovery,
  canEditFact,
  deleteMenu,
  handleAddPhase,
  handleDeletePhase,
  onStoryEventChange,
  setAddPhaseMenu,
  setDeleteMenu,
  setEventMenu,
  storyEventsByStory,
  storyKey,
  visibleEventMenu,
  weekPositions,
}: QuarterlyPlannerPlanFactTimelineMenusProps) {
  const placementContext =
    visibleEventMenu != null
      ? buildQuarterlyEventPlacementContext(
          visibleEventMenu.weekIndex,
          weekPositions,
          storyEventsByStory,
          storyKey
        )
      : null;

  return (
    <>
      <QuarterlyPlannerAddPhaseMenu
        canAddDelivery={canAddDelivery}
        canAddDiscovery={canAddDiscovery}
        menu={addPhaseMenu}
        onAddPhase={handleAddPhase}
        onClose={() => setAddPhaseMenu(null)}
      />
      <QuarterlyPlannerPhaseDeleteMenu
        menu={deleteMenu}
        onClose={() => setDeleteMenu(null)}
        onDeletePhase={handleDeletePhase}
      />
      <QuarterlyPlannerAddEventMenu
        menu={canEditFact ? visibleEventMenu : null}
        placementContext={placementContext}
        weekPositions={weekPositions}
        onClose={() => setEventMenu(null)}
        onPickEvent={(kind, weekIndex) => {
          const ctx = buildQuarterlyEventPlacementContext(
            weekIndex,
            weekPositions,
            storyEventsByStory,
            storyKey
          );
          if (!canPickStoryEventKind(kind, ctx)) return;
          onStoryEventChange(weekIndex, kind);
        }}
        onRemoveEvent={(weekIndex) => onStoryEventChange(weekIndex, null)}
      />
    </>
  );
}
