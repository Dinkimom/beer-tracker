import type { SprintPresenceFocus, SprintPresenceViewer } from './sprintRealtimeTypes';

import { collapseSprintPresenceViewers, sprintPresenceHidesOwnTab, sprintPresenceViewerReactKey } from './sprintPresenceCollapse';
import { isSprintPresenceMutatingFocusState } from './sprintRealtimeTypes';

export function sprintPresenceFocusEquals(
  left: SprintPresenceFocus | null | undefined,
  right: SprintPresenceFocus | null | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return left.state === right.state && left.targetId === right.targetId;
}

/** Drag > resize > заметка > связь > меню > hover; иначе сброс. */
export function resolveSprintCardPresenceFocus(input: {
  contextMenuTaskId: string | null;
  draggingTaskId: string | null;
  editingTaskId?: string | null;
  hoveredTaskId: string | null;
  linkingTaskId?: string | null;
  resizingTaskId?: string | null;
}): SprintPresenceFocus | null {
  const draggingTaskId = input.draggingTaskId?.trim() || null;
  if (draggingTaskId) {
    return { state: 'dragging', targetId: draggingTaskId };
  }
  const resizingTaskId = input.resizingTaskId?.trim() || null;
  if (resizingTaskId) {
    return { state: 'resizing', targetId: resizingTaskId };
  }
  const editingTaskId = input.editingTaskId?.trim() || null;
  if (editingTaskId) {
    return { state: 'editing', targetId: editingTaskId };
  }
  const linkingTaskId = input.linkingTaskId?.trim() || null;
  if (linkingTaskId) {
    return { state: 'linking', targetId: linkingTaskId };
  }
  const contextMenuTaskId = input.contextMenuTaskId?.trim() || null;
  if (contextMenuTaskId) {
    return { state: 'viewing', targetId: contextMenuTaskId };
  }
  const hoveredTaskId = input.hoveredTaskId?.trim() || null;
  if (hoveredTaskId) {
    return { state: 'viewing', targetId: hoveredTaskId };
  }
  return null;
}

export function sprintCardPresenceViewers(
  viewers: readonly SprintPresenceViewer[],
  targetId: string,
  excludeClientId: string | null
): SprintPresenceViewer[] {
  const hideOwnTab = Boolean(excludeClientId) && sprintPresenceHidesOwnTab();
  const focused = viewers.filter((viewer) => {
    if (viewer.focus?.targetId !== targetId) {
      return false;
    }
    if (hideOwnTab && viewer.clientId === excludeClientId) {
      return false;
    }
    return true;
  });
  return collapseSprintPresenceViewers(focused);
}

export function sprintCardPresenceHasChangingViewer(
  viewers: readonly SprintPresenceViewer[]
): boolean {
  return viewers.some((viewer) => isSprintPresenceMutatingFocusState(viewer.focus?.state));
}

/** Чужой drag / resize / редактор — блокируем новые жесты. Свою вкладку не учитываем даже в dev. */
export function sprintCardPresenceIsLockedByRemote(
  viewers: readonly SprintPresenceViewer[],
  ownClientId: string | null
): boolean {
  return viewers.some(
    (viewer) =>
      isSprintPresenceMutatingFocusState(viewer.focus?.state) &&
      (ownClientId == null || viewer.clientId !== ownClientId)
  );
}

export function sprintCardPresenceLocksTarget(
  viewers: readonly SprintPresenceViewer[],
  targetId: string,
  ownClientId: string | null
): boolean {
  const id = targetId.trim();
  if (!id) {
    return false;
  }
  return sprintCardPresenceIsLockedByRemote(
    sprintCardPresenceViewers(viewers, id, ownClientId),
    ownClientId
  );
}

export function sprintCardPresenceBlocksNewGestures(
  locked: boolean,
  ownGestureActive: boolean
): boolean {
  return locked && !ownGestureActive;
}

export function serializeSprintPresenceViewer(viewer: SprintPresenceViewer): SprintPresenceViewer {
  return {
    avatarUrl: viewer.avatarUrl,
    displayName: viewer.displayName,
    userId: viewer.userId,
    ...(viewer.boardView ? { boardView: viewer.boardView } : {}),
    ...(viewer.clientId ? { clientId: viewer.clientId } : {}),
    ...(viewer.focus ? { focus: viewer.focus } : {}),
    ...(viewer.gesture ? { gesture: viewer.gesture } : {}),
  };
}

/** Hover/сброс: не слать PUT на каждый mouseenter при проезде по карточкам. */
export const SPRINT_CARD_PRESENCE_VIEWING_DEBOUNCE_MS = 300;

const IMMEDIATE_PRESENCE_FOCUS_PREFIXES = ['dragging:', 'editing:', 'linking:', 'resizing:'];

/** Изменение и связь сразу; просмотр и сброс — после паузы. */
export function sprintCardPresencePublishDelayMs(desiredKey: string): number {
  if (IMMEDIATE_PRESENCE_FOCUS_PREFIXES.some((prefix) => desiredKey.startsWith(prefix))) {
    return 0;
  }
  return SPRINT_CARD_PRESENCE_VIEWING_DEBOUNCE_MS;
}

export function collectDepartedSprintCardPresenceViewers(
  previousLive: readonly SprintPresenceViewer[],
  nextLive: readonly SprintPresenceViewer[]
): SprintPresenceViewer[] {
  const nextKeys = new Set(nextLive.map(sprintPresenceViewerReactKey));
  return previousLive.filter((viewer) => !nextKeys.has(sprintPresenceViewerReactKey(viewer)));
}

export function nextSprintCardPresenceExitingViewers(input: {
  departedFrom: readonly SprintPresenceViewer[];
  exiting: readonly SprintPresenceViewer[];
  nextLive: readonly SprintPresenceViewer[];
  reducedMotion: boolean;
}): SprintPresenceViewer[] {
  if (input.reducedMotion) {
    return [];
  }
  const nextKeys = new Set(input.nextLive.map(sprintPresenceViewerReactKey));
  const stillGone = input.exiting.filter((viewer) => !nextKeys.has(sprintPresenceViewerReactKey(viewer)));
  const stillGoneKeys = new Set(stillGone.map(sprintPresenceViewerReactKey));
  const departed = collectDepartedSprintCardPresenceViewers(input.departedFrom, input.nextLive);
  return [
    ...stillGone,
    ...departed.filter((viewer) => !stillGoneKeys.has(sprintPresenceViewerReactKey(viewer))),
  ];
}

export function nextSprintCardPresenceAvatarOrderKeys(input: {
  exitingKeys: readonly string[];
  liveKeys: readonly string[];
  previousOrder: readonly string[];
}): string[] {
  const keep = new Set([...input.liveKeys, ...input.exitingKeys]);
  const kept = input.previousOrder.filter((key) => keep.has(key));
  const keptSet = new Set(kept);
  return [...kept, ...input.liveKeys.filter((key) => !keptSet.has(key))];
}

export function nextSprintCardPresenceAvatarState(input: {
  live: readonly SprintPresenceViewer[];
  previousExiting: readonly SprintPresenceViewer[];
  previousLive: readonly SprintPresenceViewer[];
  previousOrderKeys: readonly string[];
  reducedMotion: boolean;
  visibleCap: number;
}): {
  exiting: SprintPresenceViewer[];
  live: readonly SprintPresenceViewer[];
  orderKeys: string[];
} {
  const exiting = nextSprintCardPresenceExitingViewers({
    departedFrom: input.previousLive,
    exiting: input.previousExiting,
    nextLive: input.live,
    reducedMotion: input.reducedMotion,
  });
  const liveKeys = input.live.slice(0, input.visibleCap).map(sprintPresenceViewerReactKey);
  const liveKeySet = new Set(liveKeys);
  const exitingKeys = exiting
    .filter((viewer) => !liveKeySet.has(sprintPresenceViewerReactKey(viewer)))
    .map(sprintPresenceViewerReactKey);
  return {
    exiting,
    live: input.live,
    orderKeys: nextSprintCardPresenceAvatarOrderKeys({
      exitingKeys,
      liveKeys,
      previousOrder: input.previousOrderKeys,
    }),
  };
}

export function mergeSprintCardPresenceAvatarSlots(input: {
  exiting: readonly SprintPresenceViewer[];
  liveShown: readonly SprintPresenceViewer[];
  orderKeys: readonly string[];
}): Array<{ exiting: boolean; viewer: SprintPresenceViewer }> {
  const liveByKey = new Map(
    input.liveShown.map((viewer) => [sprintPresenceViewerReactKey(viewer), viewer] as const)
  );
  const exitingByKey = new Map(
    input.exiting.map((viewer) => [sprintPresenceViewerReactKey(viewer), viewer] as const)
  );
  const slots: Array<{ exiting: boolean; viewer: SprintPresenceViewer }> = [];
  for (const key of input.orderKeys) {
    const live = liveByKey.get(key);
    if (live) {
      slots.push({ exiting: false, viewer: live });
      continue;
    }
    const gone = exitingByKey.get(key);
    if (gone) {
      slots.push({ exiting: true, viewer: gone });
    }
  }
  return slots;
}
