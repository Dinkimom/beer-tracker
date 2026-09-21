import type { SprintPresenceBoardView, SprintPresenceFocus, SprintPresenceViewer } from './sprintRealtimeTypes';

import { SPRINT_PRESENCE_BOARD_VIEWS } from './sprintRealtimeTypes';

export function isSprintPresenceBoardView(value: unknown): value is SprintPresenceBoardView {
  return typeof value === 'string' && (SPRINT_PRESENCE_BOARD_VIEWS as readonly string[]).includes(value);
}

/** compact/full и любые неизвестные режимы считаем свимлейном. */
export function toSprintPresenceBoardView(viewMode: string): SprintPresenceBoardView {
  if (viewMode === 'kanban') {
    return viewMode;
  }
  return 'swimlanes';
}

type PlannerViewMode = 'compact' | 'features' | 'full' | 'kanban' | 'occupancy';

export function applySprintPresenceBoardView(
  boardView: SprintPresenceBoardView,
  setViewMode: (value: PlannerViewMode | ((prev: PlannerViewMode) => PlannerViewMode)) => void
): void {
  if (boardView === 'kanban') {
    setViewMode(boardView);
    return;
  }
  setViewMode((prev) =>
    prev === 'full' || prev === 'compact' || prev === 'features' ? prev : 'full'
  );
}

export function canRevealSprintPresenceViewer(viewer: SprintPresenceViewer): boolean {
  return Boolean(viewer.boardView || viewer.focus?.targetId);
}

export function formatSprintPresenceViewerTooltip(input: {
  action: string | null;
  name: string;
  view: string | null;
}): string {
  if (input.view && input.action) {
    return `${input.name} · ${input.view} · ${input.action}`;
  }
  if (input.view) {
    return `${input.name} · ${input.view}`;
  }
  if (input.action) {
    return `${input.name} · ${input.action}`;
  }
  return input.name;
}

export function sprintPresenceFocusActionKey(
  state: SprintPresenceFocus['state'] | undefined
): SprintPresenceFocus['state'] | null {
  return state ?? null;
}
