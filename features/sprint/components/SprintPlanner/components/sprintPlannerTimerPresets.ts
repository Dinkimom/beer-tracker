import { SPRINT_TIMER_MAX_MS } from '@/lib/realtime/sprintTimerState';

const SPRINT_TIMER_DEFAULT_MINUTES = 5;

const SPRINT_TIMER_MAX_MINUTES = 99;

export const SPRINT_TIMER_DEFAULT_MS = SPRINT_TIMER_DEFAULT_MINUTES * 60_000;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function clampSprintTimerSetupMs(ms: number): number {
  if (!Number.isFinite(ms)) {
    return SPRINT_TIMER_DEFAULT_MS;
  }
  return Math.min(SPRINT_TIMER_MAX_MS, Math.max(0, Math.round(ms)));
}

export function sprintTimerPartsFromMs(ms: number): { minutes: number; seconds: number } {
  const totalSeconds = Math.max(0, Math.floor(clampSprintTimerSetupMs(ms) / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

export function sprintTimerMsFromParts(minutes: number, seconds: number): number {
  return clampSprintTimerSetupMs(clampInt(minutes, 0, SPRINT_TIMER_MAX_MINUTES) * 60_000 + clampInt(seconds, 0, 59) * 1000);
}

export function padTimerDigits(value: number): string {
  return String(clampInt(value, 0, 99)).padStart(2, '0');
}

export function sanitizeTimerDigitInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2);
}

export function parseTimerDigitInput(raw: string, max: number): number {
  if (raw.length === 0) {
    return 0;
  }
  return clampInt(Number.parseInt(raw, 10), 0, max);
}
