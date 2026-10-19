import type { SprintContextPayload } from '@/lib/sprints/sprintContextTypes';

import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import { buildSprintContextAgenda } from '@/lib/sprints/sprintContextEnrichmentHelpers';
import {
  expandLinkScopeWithNotes,
  filterLinksByFeatureScope,
  filterNotesByAssigneeId,
  filterPositionsByAssigneeId,
  filterPositionsByTaskIds,
} from '@/lib/sprints/sprintContextFilter';
import { stampCapacityWithTeamRoles } from '@/lib/sprints/sprintContextTeamMembers';

/** Narrow an enriched sprint-context payload by assignee and/or task keys. */
export function applySprintContextQueryFilters(
  payload: SprintContextPayload,
  filters: { assigneeId?: string; taskIds?: string[] }
): SprintContextPayload {
  const assigneeId = filters.assigneeId?.trim() || undefined;
  const taskIds = (filters.taskIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (!assigneeId && taskIds.length === 0) {
    return payload;
  }

  let positions = payload.positions;
  let notes = payload.notes;
  let teamMembers = payload.teamMembers;
  if (assigneeId) {
    positions = filterPositionsByAssigneeId(positions, assigneeId);
    notes = filterNotesByAssigneeId(notes, assigneeId);
    if (teamMembers) {
      teamMembers = teamMembers.filter((member) => member.assigneeId === assigneeId);
    }
  }
  if (taskIds.length > 0) {
    positions = filterPositionsByTaskIds(positions, taskIds);
  }

  const scopeTaskIds = new Set(positions.map((position) => position.taskId));
  const taskLinks = filterLinksByFeatureScope(
    payload.taskLinks,
    expandLinkScopeWithNotes(scopeTaskIds, notes)
  );
  const calendarDays = payload.meta.calendarDays ?? [];
  const agenda = buildSprintContextAgenda(positions, calendarDays);
  const next: SprintContextPayload = {
    ...payload,
    agenda,
    notes,
    positions,
    taskLinks,
    ...(teamMembers ? { teamMembers } : {}),
  };
  next.capacity = stampCapacityWithTeamRoles(
    buildSprintContextCapacity(next),
    teamMembers ?? []
  );
  return next;
}
