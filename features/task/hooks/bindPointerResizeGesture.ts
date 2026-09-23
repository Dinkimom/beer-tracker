/**
 * Слушатели ресайза на document: mouseup фиксирует размер, Escape откатывает жест.
 */
export function bindPointerResizeGesture(input: {
  onCancel: () => void;
  onCommit: () => void;
  onMove: (event: MouseEvent) => void;
}): void {
  let ended = false;
  let commitTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = (commit: boolean) => {
    if (ended) {
      return;
    }
    ended = true;
    if (commitTimer != null) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
    detach();
    if (commit) {
      input.onCommit();
      return;
    }
    input.onCancel();
  };

  const handleMouseUp = () => {
    if (ended || commitTimer != null) {
      return;
    }
    // Браузер может отпустить кнопку на Escape раньше keydown. Коммит ждёт следующий тик.
    commitTimer = setTimeout(() => {
      commitTimer = null;
      finish(true);
    }, 0);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    // Safari: без preventDefault Escape выходит из fullscreen.
    event.preventDefault();
    event.stopPropagation();
    finish(false);
  };

  const detach = () => {
    document.removeEventListener('mousemove', input.onMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown, true);
  };

  document.addEventListener('mousemove', input.onMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown, true);
}
