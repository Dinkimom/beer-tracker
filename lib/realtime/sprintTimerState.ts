export const SPRINT_TIMER_MIN_MS = 1_000;
export const SPRINT_TIMER_MAX_MS = 99 * 60 * 1000;
export const SPRINT_TIMER_ADD_MS = 60_000;

export type SprintTimerStatus = 'finished' | 'idle' | 'paused' | 'running';

export interface SprintTimerActor {
  displayName: string;
  userId: string;
}

export interface SprintTimerState {
  durationMs: number;
  endsAt: number | null;
  remainingMs: number;
  serverNow: number;
  status: SprintTimerStatus;
  updatedAt: number;
  updatedBy: SprintTimerActor | null;
}

export type SprintTimerAction =
  | { action: 'add'; extraMs: number }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'start'; durationMs: number }
  | { action: 'stop' };

const TIMER_STATUSES: ReadonlySet<string> = new Set(['finished', 'idle', 'paused', 'running']);

export function idleSprintTimerState(now: number): SprintTimerState {
  return {
    durationMs: 0,
    endsAt: null,
    remainingMs: 0,
    serverNow: now,
    status: 'idle',
    updatedAt: 0,
    updatedBy: null,
  };
}

export function clampSprintTimerDurationMs(ms: number): number {
  if (!Number.isFinite(ms)) {
    return SPRINT_TIMER_MIN_MS;
  }
  return Math.min(SPRINT_TIMER_MAX_MS, Math.max(SPRINT_TIMER_MIN_MS, Math.round(ms)));
}

export function remainingMsAt(state: SprintTimerState, now: number): number {
  if (state.status === 'running' && state.endsAt != null) {
    return Math.max(0, state.endsAt - now);
  }
  if (state.status === 'paused') {
    return Math.max(0, state.remainingMs);
  }
  return 0;
}

export function sprintTimerStatusAt(state: SprintTimerState, now: number): SprintTimerStatus {
  if (state.status === 'running' && remainingMsAt(state, now) <= 0) {
    return 'finished';
  }
  return state.status;
}

export function formatSprintTimerClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Крупный циферблат в панели: «05 : 00». */
export function formatSprintTimerClockSpaced(ms: number): string {
  return formatSprintTimerClock(ms).replace(':', ' : ');
}

export function withSprintTimerServerNow(state: SprintTimerState, now: number): SprintTimerState {
  return { ...normalizeSprintTimerState(state, now), serverNow: now };
}

function normalizeSprintTimerState(state: SprintTimerState, now: number): SprintTimerState {
  if (state.status !== 'running') {
    return state;
  }
  const remainingMs = remainingMsAt(state, now);
  if (remainingMs > 0) {
    return { ...state, remainingMs };
  }
  return {
    ...state,
    endsAt: null,
    remainingMs: 0,
    status: 'finished',
    updatedAt: Math.max(state.updatedAt, now),
  };
}

export function applySprintTimerAction(
  current: SprintTimerState,
  action: SprintTimerAction,
  now: number,
  actor: SprintTimerActor
): SprintTimerState {
  const normalized = withSprintTimerServerNow(current, now);
  switch (action.action) {
    case 'start':
      return startSprintTimer(action.durationMs, now, actor);
    case 'pause':
      return pauseSprintTimer(normalized, now, actor);
    case 'resume':
      return resumeSprintTimer(normalized, now, actor);
    case 'stop':
      return stopSprintTimer(now);
    case 'add':
      return addSprintTimerTime(normalized, action.extraMs, now, actor);
  }
}

function startSprintTimer(durationMs: number, now: number, actor: SprintTimerActor): SprintTimerState {
  const clamped = clampSprintTimerDurationMs(durationMs);
  return {
    durationMs: clamped,
    endsAt: now + clamped,
    remainingMs: clamped,
    serverNow: now,
    status: 'running',
    updatedAt: now,
    updatedBy: actor,
  };
}

function pauseSprintTimer(
  current: SprintTimerState,
  now: number,
  actor: SprintTimerActor
): SprintTimerState {
  if (current.status !== 'running') {
    return current;
  }
  return {
    ...current,
    endsAt: null,
    remainingMs: remainingMsAt(current, now),
    serverNow: now,
    status: 'paused',
    updatedAt: now,
    updatedBy: actor,
  };
}

function resumeSprintTimer(
  current: SprintTimerState,
  now: number,
  actor: SprintTimerActor
): SprintTimerState {
  if (current.status !== 'paused' || current.remainingMs <= 0) {
    return current;
  }
  return {
    ...current,
    endsAt: now + current.remainingMs,
    serverNow: now,
    status: 'running',
    updatedAt: now,
    updatedBy: actor,
  };
}

function stopSprintTimer(now: number): SprintTimerState {
  return {
    ...idleSprintTimerState(now),
    updatedAt: now,
  };
}

function addSprintTimerTime(
  current: SprintTimerState,
  extraMs: number,
  now: number,
  actor: SprintTimerActor
): SprintTimerState {
  if (current.status !== 'running' && current.status !== 'paused') {
    return current;
  }
  const extra = Math.round(extraMs);
  if (extra === 0) {
    return current;
  }
  const remainingMs = Math.min(SPRINT_TIMER_MAX_MS, Math.max(0, remainingMsAt(current, now) + extra));
  if (remainingMs <= 0) {
    return stopSprintTimer(now);
  }
  if (current.status === 'paused') {
    return {
      ...current,
      remainingMs,
      serverNow: now,
      updatedAt: now,
      updatedBy: actor,
    };
  }
  return {
    ...current,
    endsAt: now + remainingMs,
    remainingMs,
    serverNow: now,
    updatedAt: now,
    updatedBy: actor,
  };
}

function isSprintTimerStatus(value: unknown): value is SprintTimerStatus {
  return typeof value === 'string' && TIMER_STATUSES.has(value);
}

function parseSprintTimerActor(
  value: unknown
): { actor: SprintTimerActor | null; ok: true } | { ok: false } {
  if (value == null) {
    return { actor: null, ok: true };
  }
  if (typeof value !== 'object') {
    return { ok: false };
  }
  const row = value as Record<string, unknown>;
  if (typeof row.userId !== 'string' || row.userId.length === 0 || row.userId.length > 80) {
    return { ok: false };
  }
  if (typeof row.displayName !== 'string' || row.displayName.length === 0 || row.displayName.length > 200) {
    return { ok: false };
  }
  return { actor: { displayName: row.displayName, userId: row.userId }, ok: true };
}

function isInvalidTimerNumber(value: unknown): boolean {
  return typeof value !== 'number' || !Number.isFinite(value);
}

export function parseSprintTimerState(value: unknown): SprintTimerState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (!isSprintTimerStatus(row.status)) {
    return null;
  }
  if (isInvalidTimerNumber(row.durationMs) || isInvalidTimerNumber(row.remainingMs)) {
    return null;
  }
  if (isInvalidTimerNumber(row.updatedAt) || isInvalidTimerNumber(row.serverNow)) {
    return null;
  }
  if (row.endsAt != null && isInvalidTimerNumber(row.endsAt)) {
    return null;
  }
  const updatedBy = parseSprintTimerActor(row.updatedBy);
  if (!updatedBy.ok) {
    return null;
  }
  return {
    durationMs: Math.max(0, row.durationMs as number),
    endsAt: row.endsAt == null ? null : (row.endsAt as number),
    remainingMs: Math.max(0, row.remainingMs as number),
    serverNow: row.serverNow as number,
    status: row.status,
    updatedAt: row.updatedAt as number,
    updatedBy: updatedBy.actor,
  };
}
