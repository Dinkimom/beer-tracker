import { z } from 'zod';

import { MAX_PLANNER_DAY_INDEX, MAX_PLANNER_DURATION_PARTS } from '@/constants';

import {
  SPRINT_PRESENCE_BOARD_VIEWS,
  SPRINT_PRESENCE_FOCUS_STATES,
  SPRINT_PRESENCE_GESTURE_KINDS,
} from './sprintRealtimeTypes';

const FOCUS_TARGET_ID_MAX = 200;
const GESTURE_NOTE_MAX = 2000;

export const SprintPresenceFocusBodySchema = z.object({
  boardView: z.enum(SPRINT_PRESENCE_BOARD_VIEWS).optional(),
  focus: z
    .object({
      state: z.enum(SPRINT_PRESENCE_FOCUS_STATES),
      targetId: z.string().trim().min(1).max(FOCUS_TARGET_ID_MAX),
    })
    .nullable(),
  gesture: z
    .object({
      cardRow: z
        .object({
          layerShiftUp: z.number().int().min(0).max(9),
          span: z.number().int().min(1).max(10),
        })
        .optional(),
      kind: z.enum(SPRINT_PRESENCE_GESTURE_KINDS),
      note: z
        .object({
          color: z.string().trim().min(1).max(32).optional(),
          text: z.string().max(GESTURE_NOTE_MAX).optional(),
        })
        .optional(),
      position: z
        .object({
          assignee: z.string().trim().min(1).max(FOCUS_TARGET_ID_MAX).optional(),
          duration: z.number().int().min(1).max(MAX_PLANNER_DURATION_PARTS),
          startDay: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
          startPart: z.number().int().min(0).max(12),
        })
        .optional(),
    })
    .refine((row) => row.cardRow != null || row.note != null || row.position != null)
    .nullable()
    .optional(),
  organizationId: z.string().trim().min(1),
  sprintId: z.number().int().positive(),
});
