'use client';

import type { StoryPhasePosition } from '../../../types';
import type { QuarterlyPlannerAddPhaseMenuState } from './QuarterlyPlannerAddPhaseMenu';
import type { QuarterlyPlannerPhaseDeleteMenuState } from './QuarterlyPlannerPhaseDeleteMenu';
import type { Task, TaskPosition } from '@/types';

import { QuarterlyPlannerPhaseBars } from './QuarterlyPlannerPhaseBars';

interface QuarterlyPlannerPlanFactTimelinePhaseLayerProps {
  isEditingPlan: boolean;
  phases: StoryPhasePosition[];
  rowHeightPx: number;
  storyKey: string;
  task: Task;
  weekCount: number;
  handlePositionSave: (position: TaskPosition, phase: StoryPhasePosition) => void;
  setAddPhaseMenu: (value: QuarterlyPlannerAddPhaseMenuState | null) => void;
  setDeleteMenu: (value: QuarterlyPlannerPhaseDeleteMenuState | null) => void;
}

export function QuarterlyPlannerPlanFactTimelinePhaseLayer({
  handlePositionSave,
  isEditingPlan,
  phases,
  rowHeightPx,
  setAddPhaseMenu,
  setDeleteMenu,
  storyKey,
  task,
  weekCount,
}: QuarterlyPlannerPlanFactTimelinePhaseLayerProps) {
  if (phases.length === 0) return null;

  return (
    <div className="absolute inset-0 z-10">
      <QuarterlyPlannerPhaseBars
        phases={phases}
        readonly={!isEditingPlan}
        rowHeightPx={rowHeightPx}
        storyKey={storyKey}
        task={task}
        weekCount={weekCount}
        onPhaseContextMenu={
          isEditingPlan
            ? (e, phase) => {
                setAddPhaseMenu(null);
                setDeleteMenu({ clientX: e.clientX, clientY: e.clientY, phase });
              }
            : undefined
        }
        onPositionSave={isEditingPlan ? handlePositionSave : undefined}
      />
    </div>
  );
}
