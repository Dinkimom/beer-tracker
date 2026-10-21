/** Fixed identities for the in-memory `/demo/planner` fixture set. */
export const DEMO_ORG_ID = 'a0000000-0000-4000-8000-000000000042';
export const DEMO_BOARD_ID = 42;
export const DEMO_SPRINT_PREV_ID = 101;
export const DEMO_SPRINT_ID = 102;

export const DEMO_DEV_ALICE = 'demo-alice';
export const DEMO_DEV_BOB = 'demo-bob';
export const DEMO_DEV_CAROL = 'demo-carol';
export const DEMO_DEV_DANA = 'demo-dana';
/** Исполнитель, чьи задачи съехали относительно плана на старте работы. */
export const DEMO_DEV_ERIN = 'demo-erin';

/**
 * «Сегодня» в демо: четверг 16.10.2026 — середина спринта 13–24.10.
 * Локальный полдень, чтобы не съехать на соседний день из‑за TZ.
 */
export const DEMO_PLANNER_NOW = new Date(2026, 9, 16, 12, 0, 0);
