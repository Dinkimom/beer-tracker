import type { StoryPhasePosition } from '../types';
import type { TaskPosition } from '@/types';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';

import { parseQuarterlyPhaseTaskId, quarterlyPhaseTaskId } from './storyPhasesMap';

export function storyPhaseToTaskPosition(
  storyKey: string,
  phase: StoryPhasePosition
): TaskPosition {
  const startDay = phase.sprintIndex * WORKING_DAYS + phase.startDay;
  return {
    taskId: quarterlyPhaseTaskId(storyKey, phase.id),
    startDay,
    startPart: 0,
    duration: phase.durationDays * getPartsPerDay(),
    assignee: '',
  };
}

export function taskPositionToStoryPhase(
  position: TaskPosition,
  kind: StoryPhasePosition['kind'],
  phaseId: string
): StoryPhasePosition {
  parseQuarterlyPhaseTaskId(position.taskId);
  const sprintIndex = Math.floor(position.startDay / WORKING_DAYS);
  const startDay = position.startDay % WORKING_DAYS;
  const durationDays = Math.max(1, Math.ceil(position.duration / getPartsPerDay()));
  return {
    id: phaseId,
    kind,
    sprintIndex,
    startDay,
    durationDays,
  };
}
