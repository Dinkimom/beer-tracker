type PlannerHistoryShortcut = 'redo' | 'undo';

/**
 * Не перехватывать Cmd/Ctrl+Z, пока фокус в поле ввода / contenteditable.
 */
export function isPlannerHistoryShortcutBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  const el = target instanceof HTMLElement ? target : target.parentElement;
  if (!el) {
    return false;
  }
  if (el.closest('[contenteditable="true"]')) {
    return true;
  }
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Cmd/Ctrl+Z → undo; Cmd/Ctrl+Shift+Z → redo.
 */
export function resolvePlannerHistoryShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>
): PlannerHistoryShortcut | null {
  if (event.altKey) {
    return null;
  }
  if (!event.metaKey && !event.ctrlKey) {
    return null;
  }
  if (event.key.toLowerCase() !== 'z') {
    return null;
  }
  return event.shiftKey ? 'redo' : 'undo';
}

function resolvePlannerHistoryModLabel(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent
): '⌘' | 'Ctrl' {
  return /Mac|iPhone|iPad|iPod/i.test(userAgent) ? '⌘' : 'Ctrl';
}

export function formatPlannerHistoryShortcutHint(
  action: PlannerHistoryShortcut,
  userAgent?: string
): string {
  const mod = resolvePlannerHistoryModLabel(userAgent);
  if (action === 'undo') {
    return `${mod}+Z`;
  }
  return mod === '⌘' ? '⇧⌘Z' : 'Ctrl+Shift+Z';
}
