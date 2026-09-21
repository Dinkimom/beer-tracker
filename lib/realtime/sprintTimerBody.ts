import { z } from 'zod';

import { SPRINT_TIMER_MAX_MS, SPRINT_TIMER_MIN_MS } from './sprintTimerState';

export const SprintTimerActionBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    durationMs: z.number().int().min(SPRINT_TIMER_MIN_MS).max(SPRINT_TIMER_MAX_MS),
  }),
  z.object({ action: z.literal('pause') }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('stop') }),
  z.object({
    action: z.literal('add'),
    extraMs: z
      .number()
      .int()
      .min(-SPRINT_TIMER_MAX_MS)
      .max(SPRINT_TIMER_MAX_MS)
      .refine((value) => value !== 0, { message: 'extraMs must not be 0' }),
  }),
]);
