export const RESIZABLE_SIDEBAR_ANIMATION_MS = 220;

export type ResizableSidebarPhase = 'closed' | 'entering' | 'exiting' | 'open';

export function prefersResizableSidebarReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function nextResizableSidebarPhase(
  open: boolean,
  phase: ResizableSidebarPhase,
  reducedMotion: boolean,
  instant: boolean
): ResizableSidebarPhase {
  if (open) {
    if (instant || reducedMotion) {
      return 'open';
    }
    if (phase === 'closed') {
      return 'entering';
    }
    if (phase === 'exiting') {
      return 'open';
    }
    return phase === 'entering' ? 'entering' : 'open';
  }
  if (phase === 'closed' || reducedMotion || instant) {
    return 'closed';
  }
  if (phase === 'open' || phase === 'entering') {
    return 'exiting';
  }
  return phase;
}

export function resizableSidebarShellWidthPx(
  phase: ResizableSidebarPhase,
  width: number
): number {
  return phase === 'open' ? width : 0;
}

export function isResizableSidebarWidthTransitionFinished(
  propertyName: string,
  eventTarget: EventTarget | null,
  currentTarget: EventTarget | null,
  phase: ResizableSidebarPhase
): boolean {
  return (
    phase === 'exiting' &&
    propertyName === 'width' &&
    eventTarget === currentTarget
  );
}
