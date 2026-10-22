'use client';

import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

const PLAN_PATCH_FOCUS_RING_MOTION = 'rounded-lg transition-shadow duration-200 ease';
/** Кольцо заметки рисует сам лист (globals.css): он повёрнут и с прямыми углами, контейнер — нет. */
const STICKY_NOTE_FOCUS_RING = 'sticky-note-focus-ring';
const PLAN_PATCH_FOCUS_RING_IDLE = 'shadow-[0_0_0_1px_transparent,0_0_0_3px_transparent]';
const PLAN_PATCH_FOCUS_RING_ON =
  'shadow-[0_0_0_1px_white,0_0_0_3px_rgb(14_165_233/0.8)] dark:shadow-[0_0_0_1px_#111827,0_0_0_3px_#38bdf8]';

export function resolvePlanPatchTaskBarChrome(input: {
  focusTaskId: string | null;
  /** Заметка или её черновик-замена под курсором (`usePlanPatchNoteFocus`): обе в кольце. */
  noteFocused?: boolean;
  planPatchGhost?: boolean;
  preview: PlanPatchPositionPreview | undefined;
  /** Secondary segment bar of a multi-segment ghost — hide approve toolbar. */
  suppressPlanPatchToolbar?: boolean;
  taskId: string;
}): { opacityFactor: number; ringClass: string; toolbarPreview: PlanPatchPositionPreview | null } {
  const preview = input.preview;
  const removePreview = preview?.remove === true ? preview : null;
  const addPreview = preview != null && removePreview == null && preview.changes.length === 0;
  const canRing = preview != null && removePreview == null && !addPreview;
  const focused = input.focusTaskId === input.taskId && canRing;
  const ringTone = focused ? PLAN_PATCH_FOCUS_RING_ON : PLAN_PATCH_FOCUS_RING_IDLE;
  const ghostToolbar =
    input.planPatchGhost && !input.suppressPlanPatchToolbar ? (preview ?? null) : null;
  let ringClass = canRing ? ` ${PLAN_PATCH_FOCUS_RING_MOTION} ${ringTone}` : '';
  if (input.noteFocused) {
    ringClass = ` ${STICKY_NOTE_FOCUS_RING}`;
  }
  return {
    opacityFactor: removePreview && !input.planPatchGhost ? 0.65 : 1,
    ringClass,
    toolbarPreview: ghostToolbar ?? (input.suppressPlanPatchToolbar ? null : removePreview),
  };
}
