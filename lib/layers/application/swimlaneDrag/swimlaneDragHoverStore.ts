import type { CellPosition } from './swimlaneDragTypes';

import { areCellPositionsEqual } from './swimlaneDragCellUtils';

type Listener = () => void;

interface FrameScheduler {
  cancel: (id: number) => void;
  request: (callback: () => void) => number;
}

const animationFrameScheduler: FrameScheduler = {
  cancel: (id) => cancelAnimationFrame(id),
  request: (callback) => requestAnimationFrame(callback),
};

/**
 * Ячейка под курсором во время DnD свимлейна — вне React state.
 *
 * - `getLatest()` обновляется синхронно: drag-end читает свежую ячейку без ожидания кадра.
 * - Подписчики получают не больше одного уведомления за кадр и только при смене ячейки.
 * - Подписчики читают `getSnapshot()` через селектор: строка, которой hover не касается,
 *   получает тот же `null` и не перерисовывается.
 */
export class SwimlaneDragHoverStore {
  private committed: CellPosition | null = null;
  private frameId: number | null = null;
  private latest: CellPosition | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly scheduler: FrameScheduler;

  constructor(scheduler: FrameScheduler = animationFrameScheduler) {
    this.scheduler = scheduler;
  }

  readonly getSnapshot = (): CellPosition | null => this.committed;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getLatest(): CellPosition | null {
    return this.latest;
  }

  set(cell: CellPosition | null): void {
    if (areCellPositionsEqual(this.latest, cell)) {
      return;
    }
    this.latest = cell;
    if (cell === null) {
      this.cancelFrame();
      this.commit();
      return;
    }
    if (this.frameId !== null) {
      return;
    }
    this.frameId = this.scheduler.request(() => {
      this.frameId = null;
      this.commit();
    });
  }

  reset(): void {
    this.cancelFrame();
    this.latest = null;
    this.commit();
  }

  dispose(): void {
    this.cancelFrame();
  }

  private cancelFrame(): void {
    if (this.frameId !== null) {
      this.scheduler.cancel(this.frameId);
      this.frameId = null;
    }
  }

  private commit(): void {
    if (this.committed === this.latest) {
      return;
    }
    this.committed = this.latest;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
