'use client';

import type {
  QuarterlyPlanPhaseKind,
  QuarterlyStoryEventKind,
  StoryEventsByStory,
  StoryPhasePosition,
} from '../../../types';
import type { QuarterlyPlannerAddEventMenuState } from './QuarterlyPlannerAddEventMenu';
import type { QuarterlyPlannerAddPhaseMenuState } from './QuarterlyPlannerAddPhaseMenu';
import type { QuarterlyPlannerPhaseDeleteMenuState } from './QuarterlyPlannerPhaseDeleteMenu';
import type { Developer } from '@/types';
import type { Task, TaskPosition } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { buildQuarterlyPlanWeekPositions } from '../../../hooks/quarterlyPlannerPlanFactTimelineHelpers';
import { planFactWeekFillClass } from '../../../utils/quarterlyPlannerWeekFill';

import { QuarterlyPlannerPlanFactTimelineMenus } from './QuarterlyPlannerPlanFactTimelineMenus';
import { QuarterlyPlannerPlanFactTimelinePhaseLayer } from './QuarterlyPlannerPlanFactTimelinePhaseLayer';
import { QuarterlyPlannerPlanFactTimelineWeekCells } from './QuarterlyPlannerPlanFactTimelineWeekCells';
import { QuarterlyPlannerPlanFactWeekOverlay } from './QuarterlyPlannerPlanFactWeekOverlay';
import { QuarterlyPlannerTimelineWeekStrip } from './QuarterlyPlannerTimelineWeekStrip';
import { QuarterlyPlannerWeekFilledStrip } from './QuarterlyPlannerWeekFilledStrip';

interface QuarterlyPlannerPlanFactTimelineBodyProps {
  addPhaseMenu: QuarterlyPlannerAddPhaseMenuState | null;
  canAddAnyPhase: boolean;
  canAddDelivery: boolean;
  canAddDiscovery: boolean;
  canEditFact: boolean;
  cellWidthStyle: { minWidth: number | undefined; width: number | string };
  deleteMenu: QuarterlyPlannerPhaseDeleteMenuState | null;
  developerMap: Map<string, Developer>;
  isEditingPlan: boolean;
  issueCommentsByWeek?: Map<number, IssueComment[]>;
  phases: StoryPhasePosition[];
  rowHeightPx: number;
  storyEventsByStory: StoryEventsByStory;
  storyKey: string;
  task: Task;
  visibleEventMenu: QuarterlyPlannerAddEventMenuState | null;
  weekColumnWidth: number | undefined;
  weekCount: number;
  weekPositions: ReturnType<typeof buildQuarterlyPlanWeekPositions>;
  handleAddPhase: (kind: QuarterlyPlanPhaseKind, weekIndex: number) => void;
  handleAddPhaseClick: (weekIndex: number, anchorEl: HTMLElement) => void;
  handleDeletePhase: (phaseId: string) => void;
  handlePositionSave: (position: TaskPosition, phase: StoryPhasePosition) => void;
  isWeekOccupiedByPlan: (weekIndex: number) => boolean;
  onStoryEventChange: (weekIndex: number, kind: QuarterlyStoryEventKind | null) => void;
  openEventMenu: (weekIndex: number, anchorEl: HTMLElement) => void;
  setAddPhaseMenu: (value: QuarterlyPlannerAddPhaseMenuState | null) => void;
  setDeleteMenu: (value: QuarterlyPlannerPhaseDeleteMenuState | null) => void;
  setEventMenu: (value: QuarterlyPlannerAddEventMenuState | null) => void;
}

export function QuarterlyPlannerPlanFactTimelineBody(props: QuarterlyPlannerPlanFactTimelineBodyProps) {
  const activeMenuWeekIndex =
    props.visibleEventMenu?.weekIndex ?? props.addPhaseMenu?.weekIndex ?? null;

  return (
    <>
      <QuarterlyPlannerTimelineWeekStrip
        className="absolute inset-0 z-[5] pointer-events-none"
        fillContainer
        rowHeightPx={props.rowHeightPx}
        weekColumnWidth={props.weekColumnWidth}
        weekCount={props.weekCount}
      />
      {!props.isEditingPlan ? (
        <div className="absolute inset-0 z-[7] pointer-events-none">
          <QuarterlyPlannerWeekFilledStrip
            fillContainer
            getFillClass={(weekIndex) =>
              planFactWeekFillClass(
                weekIndex,
                props.weekPositions,
                props.storyEventsByStory,
                props.storyKey
              )
            }
            rowHeightPx={props.rowHeightPx}
            weekColumnWidth={props.weekColumnWidth}
            weekCount={props.weekCount}
          />
        </div>
      ) : null}
      <QuarterlyPlannerPlanFactTimelinePhaseLayer
        handlePositionSave={props.handlePositionSave}
        isEditingPlan={props.isEditingPlan}
        phases={props.phases}
        rowHeightPx={props.rowHeightPx}
        setAddPhaseMenu={props.setAddPhaseMenu}
        setDeleteMenu={props.setDeleteMenu}
        storyKey={props.storyKey}
        task={props.task}
        weekCount={props.weekCount}
      />
      <QuarterlyPlannerPlanFactTimelineWeekCells
        activeMenuWeekIndex={activeMenuWeekIndex}
        canAddAnyPhase={props.canAddAnyPhase}
        canEditFact={props.canEditFact}
        cellWidthStyle={props.cellWidthStyle}
        handleAddPhaseClick={props.handleAddPhaseClick}
        isEditingPlan={props.isEditingPlan}
        isWeekOccupiedByPlan={props.isWeekOccupiedByPlan}
        openEventMenu={props.openEventMenu}
        storyEventsByStory={props.storyEventsByStory}
        storyKey={props.storyKey}
        weekCount={props.weekCount}
      />
      <QuarterlyPlannerTimelineWeekStrip
        className="absolute inset-0 z-[30] pointer-events-none"
        fillContainer
        rowHeightPx={props.rowHeightPx}
        showWeekDividers={false}
        weekColumnWidth={props.weekColumnWidth}
        weekCount={props.weekCount}
      >
        {(weekIndex) => (
          <QuarterlyPlannerPlanFactWeekOverlay
            developerMap={props.developerMap}
            isEditingPlan={props.isEditingPlan}
            issueCommentsByWeek={props.issueCommentsByWeek}
            storyEventsByStory={props.storyEventsByStory}
            storyKey={props.storyKey}
            weekIndex={weekIndex}
            onOpenEventMenu={props.openEventMenu}
          />
        )}
      </QuarterlyPlannerTimelineWeekStrip>
      <QuarterlyPlannerPlanFactTimelineMenus
        addPhaseMenu={props.addPhaseMenu}
        canAddDelivery={props.canAddDelivery}
        canAddDiscovery={props.canAddDiscovery}
        canEditFact={props.canEditFact}
        deleteMenu={props.deleteMenu}
        handleAddPhase={props.handleAddPhase}
        handleDeletePhase={props.handleDeletePhase}
        setAddPhaseMenu={props.setAddPhaseMenu}
        setDeleteMenu={props.setDeleteMenu}
        setEventMenu={props.setEventMenu}
        storyEventsByStory={props.storyEventsByStory}
        storyKey={props.storyKey}
        visibleEventMenu={props.visibleEventMenu}
        weekPositions={props.weekPositions}
        onStoryEventChange={props.onStoryEventChange}
      />
    </>
  );
}
