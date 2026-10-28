import type { FrameScheduler } from './frameThrottledValueStore';
import type { CellPosition } from './swimlaneDragTypes';

import { FrameThrottledValueStore } from './frameThrottledValueStore';
import { areCellPositionsEqual } from './swimlaneDragCellUtils';

/**
 * Ячейка под курсором во время DnD свимлейна — вне React state.
 *
 * Подписчики читают `getSnapshot()` через селектор: строка, которой hover не касается,
 * получает тот же `null` и не перерисовывается.
 */
export class SwimlaneDragHoverStore extends FrameThrottledValueStore<CellPosition> {
  constructor(scheduler?: FrameScheduler) {
    super(areCellPositionsEqual, scheduler);
  }
}
