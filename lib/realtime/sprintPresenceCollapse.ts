import type { SprintPresenceViewer } from './sprintRealtimeTypes';

import { isSprintPresenceMutatingFocusState } from './sprintRealtimeTypes';

function normalizePresenceUserId(userId: string): string {
  return userId.trim().toLowerCase();
}

/**
 * В `next dev` каждое SSE-подключение — отдельный человек, чтобы гонять два браузера
 * под одним логином. В production вкладки снова схлопываются по userId.
 */
function isSprintPresenceDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** Свою вкладку не рисуем: ни обводку карточки, ни live-жест «самому себе». */
export function sprintPresenceHidesOwnTab(): boolean {
  return true;
}

/** Стек в шапке — только когда на доске уже кто-то ещё, не один ты. */
export function sprintPresenceAvatarMinCount(): number {
  return 2;
}

function presenceCollapseKey(viewer: SprintPresenceViewer): string {
  if (isSprintPresenceDevMode() && viewer.clientId) {
    return `c:${viewer.clientId}`;
  }
  return normalizePresenceUserId(viewer.userId);
}

/** Имя из fallback `userId.slice(0, 8)` или сырой id — не показывать в UI. */
function presenceDisplayLooksLikeIdStub(viewer: SprintPresenceViewer): boolean {
  const name = viewer.displayName.trim();
  const userId = viewer.userId.trim();
  if (!name) {
    return true;
  }
  return name === userId || name === userId.slice(0, 8);
}

export function sprintPresenceDisplayName(viewer: SprintPresenceViewer, anonymousLabel: string): string {
  if (viewer.userId === 'onprem-anonymous' || presenceDisplayLooksLikeIdStub(viewer)) {
    return anonymousLabel;
  }
  return viewer.displayName;
}

/** React key совпадает с ключом схлопывания: в dev вкладки различимы, в prod — один человек. */
export function sprintPresenceViewerReactKey(viewer: SprintPresenceViewer): string {
  return presenceCollapseKey(viewer);
}

function presenceViewerScore(viewer: SprintPresenceViewer): number {
  let score = 0;
  if (viewer.avatarUrl) {
    score += 2;
  }
  if (!presenceDisplayLooksLikeIdStub(viewer)) {
    score += 1;
  }
  return score;
}

function presenceFocusScore(viewer: SprintPresenceViewer): number {
  if (isSprintPresenceMutatingFocusState(viewer.focus?.state)) {
    return 3;
  }
  if (viewer.focus?.state === 'linking') {
    return 2;
  }
  if (viewer.focus?.state === 'viewing') {
    return 1;
  }
  return 0;
}

function mergeCollapsedPresenceViewer(
  existing: SprintPresenceViewer,
  incoming: SprintPresenceViewer
): SprintPresenceViewer {
  const preferIncomingIdentity = presenceViewerScore(incoming) > presenceViewerScore(existing);
  const base = preferIncomingIdentity ? incoming : existing;
  const focusSource = presenceFocusScore(incoming) > presenceFocusScore(existing) ? incoming : existing;
  const boardView = focusSource.boardView ?? base.boardView;
  return {
    avatarUrl: base.avatarUrl,
    displayName: base.displayName,
    userId: base.userId,
    ...(boardView ? { boardView } : {}),
    ...(focusSource.clientId ? { clientId: focusSource.clientId } : {}),
    ...(focusSource.focus ? { focus: focusSource.focus } : {}),
    ...(focusSource.gesture ? { gesture: focusSource.gesture } : {}),
  };
}

/**
 * Несколько вкладок/браузеров одного человека — один аватар.
 * Если есть и «сырой» id, и профиль из реестра, оставляем профиль.
 * Фокус: изменение (drag/resize/edit) важнее связи и просмотра.
 * В development ключ — clientId (локальная проверка двумя браузерами).
 */
function viewerUiSignature(viewer: SprintPresenceViewer, ignoreGesture: boolean): string {
  return JSON.stringify({
    avatarUrl: viewer.avatarUrl,
    boardView: viewer.boardView ?? null,
    clientId: viewer.clientId ?? null,
    displayName: viewer.displayName,
    focus: viewer.focus ?? null,
    gesture: ignoreGesture ? null : viewer.gesture ?? null,
    userId: viewer.userId,
  });
}

/**
 * Свой live-жест (drag/resize) не должен пересобирать React-дерево планера.
 * Чужие жесты и смена фокуса по-прежнему обновляют список.
 */
export function sprintPresenceViewersUiEqual(
  previous: readonly SprintPresenceViewer[],
  next: readonly SprintPresenceViewer[],
  ownClientId: string | null
): boolean {
  if (previous.length !== next.length) {
    return false;
  }
  for (let index = 0; index < previous.length; index += 1) {
    const left = previous[index];
    const right = next[index];
    if (!left || !right) {
      return false;
    }
    const ignoreGesture = Boolean(ownClientId && right.clientId === ownClientId);
    if (viewerUiSignature(left, ignoreGesture) !== viewerUiSignature(right, ignoreGesture)) {
      return false;
    }
  }
  return true;
}

export function collapseSprintPresenceViewers(
  viewers: readonly SprintPresenceViewer[]
): SprintPresenceViewer[] {
  const byKey = new Map<string, SprintPresenceViewer>();
  for (const viewer of viewers) {
    const userId = normalizePresenceUserId(viewer.userId);
    if (!userId) {
      continue;
    }
    const normalized = { ...viewer, userId };
    const key = presenceCollapseKey(normalized);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeCollapsedPresenceViewer(existing, normalized) : normalized);
  }
  return [...byKey.values()].sort((a, b) => {
    const byName = a.displayName.localeCompare(b.displayName);
    if (byName !== 0) {
      return byName;
    }
    const byUser = a.userId.localeCompare(b.userId);
    if (byUser !== 0) {
      return byUser;
    }
    return (a.clientId ?? '').localeCompare(b.clientId ?? '');
  });
}
