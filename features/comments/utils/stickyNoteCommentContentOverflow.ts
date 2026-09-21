const STICKY_NOTE_CONTENT_OVERFLOW_EPSILON_PX = 0.5;

export const STICKY_NOTE_CONTENT_DATA_ATTR = 'data-sticky-note-content';
export const STICKY_NOTE_CONTENT_OVERFLOW_DATA_ATTR = 'data-sticky-note-content-overflows';

function elementContentOverflows(element: HTMLElement): boolean {
  return element.scrollHeight > element.clientHeight + STICKY_NOTE_CONTENT_OVERFLOW_EPSILON_PX;
}

/** True when sticky-note body is clipped at the current card size. */
export function doesStickyNoteCommentContentOverflow(root: HTMLElement | null): boolean {
  if (!root) {
    return false;
  }

  if (root.dataset.stickyNoteMarkdown === 'true') {
    return elementContentOverflows(root);
  }

  const clamped = root.querySelector<HTMLElement>('[data-sticky-note-clamped-text]');
  if (clamped) {
    return elementContentOverflows(clamped);
  }

  return false;
}

export function syncStickyNoteCommentContentOverflowFlag(root: HTMLElement | null): void {
  if (!root) {
    return;
  }
  root.setAttribute(
    STICKY_NOTE_CONTENT_OVERFLOW_DATA_ATTR,
    doesStickyNoteCommentContentOverflow(root) ? 'true' : 'false'
  );
}

export function isStickyNoteCommentContentOverflowFlagSet(root: HTMLElement | null): boolean {
  return root?.getAttribute(STICKY_NOTE_CONTENT_OVERFLOW_DATA_ATTR) === 'true';
}
