'use client';

import type {
  QuarterlyPlanPhaseKind,
  QuarterlySprintInfo,
  QuarterlyStoryEventKind,
  StoryEventsByStory,
  StoryPhasePosition,
} from '../../../types';
import type { QuarterlyPlannerAddEventMenuState } from './QuarterlyPlannerAddEventMenu';
import type { QuarterlyPlannerAddPhaseMenuState } from './QuarterlyPlannerAddPhaseMenu';
import type { QuarterlyPlannerPhaseDeleteMenuState } from './QuarterlyPlannerPhaseDeleteMenu';
import type { QuarterlyWeekColumn } from '@/features/quarterly-planning-v2/utils/quarterlyTimelineHeader';
import type { Developer, Task, TaskPosition } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  buildQuarterlyPlanWeekPositions,
  createQuarterlyAddPhaseMenuState,
  createQuarterlyEventMenuState,
  isQuarterlyPlanWeekOccupied,
  observeQuarterlyPlanFactRowHeight,
  quarterlyPlanFactCellWidthStyle,
  tryAddQuarterlyPlanPhase,
  trySaveQuarterlyPlanPhasePosition,
} from '../../../hooks/quarterlyPlannerPlanFactTimelineHelpers';
import { useQuarterlyWeekPositions } from '../../../hooks/useQuarterlyWeekPositions';
import { hasQuarterlyPhaseKind } from '../../../utils/storyPhasesMap';
import { QUARTERLY_PLAN_ROW_HEIGHT_PX } from '../quarterlyPlannerLayout';

import { QuarterlyPlannerPlanFactTimelineBody } from './QuarterlyPlannerPlanFactTimelineBody';

interface QuarterlyPlannerPlanFactTimelineProps {
  developerMap: Map<string, Developer>;
  isEditingPlan: boolean;
  issueCommentsByWeek?: Map<number, IssueComment[]>;
  phases: StoryPhasePosition[];
  sprintInfos: QuarterlySprintInfo[];
  storyEventsByStory: StoryEventsByStory;
  storyKey: string;
  task: Task;
  weekColumns: QuarterlyWeekColumn[];
  weekColumnWidth: number | undefined;
  weekCount: number;
  onPhasesChange: (storyKey: string, phases: StoryPhasePosition[]) => void;
  onStoryEventChange: (
    weekIndex: number,
    kind: QuarterlyStoryEventKind | null
  ) => void;
}

/** Одна строка: план (фазы) + факт (события). Факт редактируется только при выключенном «Редактировать план». */
export function QuarterlyPlannerPlanFactTimeline({
  task,
  storyKey,
  phases,
  weekCount,
  weekColumns: _weekColumns,
  sprintInfos: _sprintInfos,
  weekColumnWidth,
  isEditingPlan,
  storyEventsByStory,
  issueCommentsByWeek,
  developerMap,
  onPhasesChange,
  onStoryEventChange,
}: QuarterlyPlannerPlanFactTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeightPx, setRowHeightPx] = useState(QUARTERLY_PLAN_ROW_HEIGHT_PX);
  const canEditFact = !isEditingPlan;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return observeQuarterlyPlanFactRowHeight(el, setRowHeightPx);
  }, []);

  const { toWeekPosition } = useQuarterlyWeekPositions();

  const [deleteMenu, setDeleteMenu] = useState<QuarterlyPlannerPhaseDeleteMenuState | null>(null);
  const [addPhaseMenu, setAddPhaseMenu] = useState<QuarterlyPlannerAddPhaseMenuState | null>(null);
  const [eventMenu, setEventMenu] = useState<QuarterlyPlannerAddEventMenuState | null>(null);
  const visibleEventMenu = isEditingPlan ? null : eventMenu;

  const canAddDelivery = !hasQuarterlyPhaseKind(phases, 'delivery');
  const canAddDiscovery = !hasQuarterlyPhaseKind(phases, 'discovery');
  const canAddAnyPhase = canAddDelivery || canAddDiscovery;

  const weekPositions = useMemo(
    () => buildQuarterlyPlanWeekPositions(phases, storyKey, toWeekPosition),
    [phases, storyKey, toWeekPosition]
  );

  const isWeekOccupiedByPlan = useCallback(
    (weekIndex: number) => isQuarterlyPlanWeekOccupied(weekIndex, weekPositions),
    [weekPositions]
  );

  const updatePhases = useCallback(
    (next: StoryPhasePosition[]) => {
      onPhasesChange(storyKey, next);
    },
    [onPhasesChange, storyKey]
  );

  const handleAddPhase = useCallback(
    (kind: QuarterlyPlanPhaseKind, weekIndex: number) => {
      const added = tryAddQuarterlyPlanPhase({
        canAddDelivery,
        canAddDiscovery,
        kind,
        phases,
        storyKey,
        toWeekPosition,
        updatePhases,
        weekIndex,
      });
      if (added) setAddPhaseMenu(null);
    },
    [canAddDelivery, canAddDiscovery, phases, storyKey, toWeekPosition, updatePhases]
  );

  const handlePositionSave = useCallback(
    (position: TaskPosition, phase: StoryPhasePosition) => {
      trySaveQuarterlyPlanPhasePosition({
        phase,
        phases,
        position,
        storyKey,
        toWeekPosition,
        updatePhases,
      });
    },
    [phases, storyKey, toWeekPosition, updatePhases]
  );

  const handleDeletePhase = useCallback(
    (phaseId: string) => {
      updatePhases(phases.filter((p) => p.id !== phaseId));
    },
    [phases, updatePhases]
  );

  const cellWidthStyle = useMemo(
    () => quarterlyPlanFactCellWidthStyle(weekColumnWidth, weekCount),
    [weekColumnWidth, weekCount]
  );

  const openEventMenu = useCallback(
    (weekIndex: number, anchorEl: HTMLElement) => {
      setEventMenu(createQuarterlyEventMenuState(weekIndex, anchorEl, storyEventsByStory, storyKey));
    },
    [storyEventsByStory, storyKey]
  );

  const handleAddPhaseClick = useCallback(
    (weekIndex: number, anchorEl: HTMLElement) => {
      setDeleteMenu(null);
      setEventMenu(null);
      setAddPhaseMenu(createQuarterlyAddPhaseMenuState(weekIndex, anchorEl));
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 min-h-[40px] w-full"
      data-quarterly-plan-fact-row
    >
      <QuarterlyPlannerPlanFactTimelineBody
        addPhaseMenu={addPhaseMenu}
        canAddAnyPhase={canAddAnyPhase}
        canAddDelivery={canAddDelivery}
        canAddDiscovery={canAddDiscovery}
        canEditFact={canEditFact}
        cellWidthStyle={cellWidthStyle}
        deleteMenu={deleteMenu}
        developerMap={developerMap}
        handleAddPhase={handleAddPhase}
        handleAddPhaseClick={handleAddPhaseClick}
        handleDeletePhase={handleDeletePhase}
        handlePositionSave={handlePositionSave}
        isEditingPlan={isEditingPlan}
        isWeekOccupiedByPlan={isWeekOccupiedByPlan}
        issueCommentsByWeek={issueCommentsByWeek}
        openEventMenu={openEventMenu}
        phases={phases}
        rowHeightPx={rowHeightPx}
        setAddPhaseMenu={setAddPhaseMenu}
        setDeleteMenu={setDeleteMenu}
        setEventMenu={setEventMenu}
        storyEventsByStory={storyEventsByStory}
        storyKey={storyKey}
        task={task}
        visibleEventMenu={visibleEventMenu}
        weekColumnWidth={weekColumnWidth}
        weekCount={weekCount}
        weekPositions={weekPositions}
        onStoryEventChange={onStoryEventChange}
      />
    </div>
  );
}
