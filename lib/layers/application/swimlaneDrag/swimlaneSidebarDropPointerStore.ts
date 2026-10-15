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
 * Y курсора над сайдбаром во время DnD — вне React state планера.
 *
 * - `getLatest()` синхронно: insert-index / drag-end читают свежий Y без кадра.
 * - Подписчики (список задач сайдбара) — ≤1 уведомление за кадр и только при смене Y.
 * - Планер при движении внутри сайдбара не делает setState.
 */
export class SwimlaneSidebarDropPointerStore {
  private committed: number | null = null;
  private frameId: number | null = null;
  private latest: number | null = null;
  private readonly listeners = new Set<Listener>();
  private readonly scheduler: FrameScheduler;

  constructor(scheduler: FrameScheduler = animationFrameScheduler) {
    this.scheduler = scheduler;
  }

  readonly getSnapshot = (): number | null => this.committed;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getLatest(): number | null {
    return this.latest;
  }

  set(pointerY: number | null): void {
    if (this.latest === pointerY) {
      return;
    }
    this.latest = pointerY;
    if (pointerY === null) {
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
