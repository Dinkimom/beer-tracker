'use client';

import {
  getDragSourceGhostRadiusClass,
  type ResizeHandleCornerStyle,
} from './components/taskBarResizeHandleHelpers';

export function TaskBarDragSourceGhost(props: {
  cornerStyle?: ResizeHandleCornerStyle;
  enabled: boolean;
  /** Источник не смещается (DragOverlay): обводка на месте без компенсации transform. */
  pinToSource?: boolean;
  transform: { x: number; y: number } | null;
}) {
  const { cornerStyle = 'rounded', enabled, pinToSource = false, transform } = props;
  if (!enabled) return null;
  if (!pinToSource && !transform) return null;

  return (
    <div
      aria-hidden
      className={`absolute inset-0 z-0 ${getDragSourceGhostRadiusClass(cornerStyle)} border-2 border-dashed border-gray-400/70 dark:border-white/30 pointer-events-none`}
      style={{
        transform: pinToSource || !transform
          ? undefined
          : `translate3d(${-Math.round(transform.x)}px, ${-Math.round(transform.y)}px, 0)`,
        opacity: 0.9,
      }}
    />
  );
}
