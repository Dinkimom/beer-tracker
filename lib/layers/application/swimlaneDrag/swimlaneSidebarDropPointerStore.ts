import type { FrameScheduler } from './frameThrottledValueStore';

import { FrameThrottledValueStore } from './frameThrottledValueStore';

/**
 * Y курсора над сайдбаром во время DnD — вне React state планера.
 * Подписчик — список задач сайдбара; планер при движении внутри сайдбара не делает setState.
 */
export class SwimlaneSidebarDropPointerStore extends FrameThrottledValueStore<number> {
  constructor(scheduler?: FrameScheduler) {
    super((a, b) => a === b, scheduler);
  }
}
