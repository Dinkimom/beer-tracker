type Listener = () => void;

export interface FrameScheduler {
  cancel: (id: number) => void;
  request: (callback: () => void) => number;
}

const animationFrameScheduler: FrameScheduler = {
  cancel: (id) => cancelAnimationFrame(id),
  request: (callback) => requestAnimationFrame(callback),
};

/**
 * Значение указателя во время DnD — вне React state (для `useSyncExternalStore`).
 *
 * - `getLatest()` обновляется синхронно: drag-end читает свежее значение без ожидания кадра.
 * - Подписчики получают не больше одного уведомления за кадр и только при смене значения.
 * - `null` (указатель ушёл) коммитится сразу, без кадра.
 */
export class FrameThrottledValueStore<T> {
  private committed: T | null = null;
  private frameId: number | null = null;
  private latest: T | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly isEqual: (a: T | null, b: T | null) => boolean,
    private readonly scheduler: FrameScheduler = animationFrameScheduler
  ) {}

  readonly getSnapshot = (): T | null => this.committed;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getLatest(): T | null {
    return this.latest;
  }

  set(value: T | null): void {
    if (this.isEqual(this.latest, value)) {
      return;
    }
    this.latest = value;
    if (value === null) {
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
