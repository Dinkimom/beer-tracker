import { useCallback, useRef } from 'react';

import {
  hasLinkDragMoved,
  shouldPreventLinkNavigation,
} from './taskCardContentHelpers';

export function useTaskCardKeyLinkProps(input: {
  displayId: string;
  isDragging: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  trackerUrl: string;
}) {
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);

  const onKeyLinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (shouldPreventLinkNavigation(input.isDragging, hasMoved.current)) {
        e.preventDefault();
      }
    },
    [input.isDragging]
  );

  const onLinkMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (input.isDragging) {
        e.preventDefault();
        return;
      }
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      hasMoved.current = false;
    },
    [input.isDragging]
  );

  const onLinkMouseMove = useCallback((e: React.MouseEvent) => {
    if (hasLinkDragMoved(mouseDownPos.current, e.clientX, e.clientY)) {
      hasMoved.current = true;
    }
  }, []);

  const onLinkPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  return {
    href: input.trackerUrl,
    rel: 'noopener noreferrer' as const,
    target: '_blank' as const,
    title: input.t('task.card.openInTracker', { id: input.displayId }),
    style: { pointerEvents: input.isDragging ? ('none' as const) : ('auto' as const) },
    onClick: onKeyLinkClick,
    onMouseDown: onLinkMouseDown,
    onMouseMove: onLinkMouseMove,
    onPointerDown: onLinkPointerDown,
  };
}
