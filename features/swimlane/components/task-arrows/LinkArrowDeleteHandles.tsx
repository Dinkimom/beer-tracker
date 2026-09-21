'use client';

import { useEffect, useRef, useState } from 'react';
import { useXarrow } from 'react-xarrows';

import { ZIndex } from '@/constants';
import { LinkArrowDeleteButton } from '@/features/swimlane/components/task-arrows/LinkArrowDeleteButton';
import { resolveNearestAnchorsForElementIds } from '@/features/swimlane/components/task-arrows/taskArrowLinkHelpers';
import {
  type LinkArrowDeleteHandle,
  isLinkDeleteHandleVisible,
  resolveLinkDeleteHandleStyle,
} from '@/features/swimlane/utils/task-arrows/linkArrowDeleteHandleHelpers';
import { TASK_ARROW_LAYER_SHELL_STYLE } from '@/features/swimlane/utils/task-arrows/taskArrowsLayerStyle';

interface LinkArrowDeleteHandlesProps {
  handles: LinkArrowDeleteHandle[];
  hoveredLinkId: string | null;
  hoveredSourceId: string | null;
  /** Режим «Связь»: не фильтруем крестики по ховеру. */
  showAll?: boolean;
  onDelete: (linkId: string) => void;
  onHoveredLinkIdChange: (id: string | null) => void;
  onSourceHoverEnd?: () => void;
}

interface PlacedDeleteHandle {
  fromTaskId: string;
  id: string;
  left: number;
  top: number;
}

/** Чтобы успеть навести на крестик после ухода с карточки (оверлей перехватывает pointer). */
const LINK_DELETE_HANDLE_HIDE_DELAY_MS = 250;

function samePlacedHandles(a: PlacedDeleteHandle[], b: PlacedDeleteHandle[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return other != null &&
      item.fromTaskId === other.fromTaskId &&
      item.id === other.id &&
      item.left === other.left &&
      item.top === other.top;
  });
}

function collectPlacedHandles(
  handles: LinkArrowDeleteHandle[],
  overlay: HTMLDivElement
): PlacedDeleteHandle[] {
  const overlayRect = overlay.getBoundingClientRect();
  const next: PlacedDeleteHandle[] = [];
  for (const handle of handles) {
    const { startAnchor } = resolveNearestAnchorsForElementIds(
      handle.startElementId,
      handle.toElementId
    );
    const offset = resolveLinkDeleteHandleStyle(
      handle.startElementId,
      startAnchor,
      overlayRect
    );
    if (!offset) continue;
    next.push({
      fromTaskId: handle.fromTaskId,
      id: handle.id,
      left: Math.round(offset.left),
      top: Math.round(offset.top),
    });
  }
  return next;
}

export function LinkArrowDeleteHandles({
  handles,
  hoveredLinkId,
  hoveredSourceId,
  showAll = false,
  onDelete,
  onHoveredLinkIdChange,
  onSourceHoverEnd,
}: LinkArrowDeleteHandlesProps) {
  useXarrow();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [heldSourceId, setHeldSourceId] = useState<string | null>(hoveredSourceId);
  const [placedHandles, setPlacedHandles] = useState<PlacedDeleteHandle[]>([]);

  if (!showAll && hoveredSourceId != null && hoveredSourceId !== heldSourceId) {
    setHeldSourceId(hoveredSourceId);
  }

  const sourceForVisibility = hoveredSourceId ?? heldSourceId;
  const visibleHandles = handles.filter((handle) =>
    isLinkDeleteHandleVisible({
      fromTaskId: handle.fromTaskId,
      handleId: handle.id,
      hoveredLinkId,
      hoveredSourceId: sourceForVisibility,
      showAll,
    })
  );

  useEffect(() => {
    if (showAll || hoveredSourceId != null) return;
    const timeoutId = window.setTimeout(() => {
      setHeldSourceId(null);
    }, LINK_DELETE_HANDLE_HIDE_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [hoveredSourceId, showAll]);

  useEffect(() => {
    if (!showAll && hoveredLinkId != null) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const recollect = () => {
      const next = collectPlacedHandles(visibleHandles, overlay);
      setPlacedHandles((prev) => (samePlacedHandles(prev, next) ? prev : next));
    };

    recollect();
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(recollect);
    const sources: HTMLElement[] = [];
    const seen = new Set<string>();
    for (const handle of visibleHandles) {
      if (seen.has(handle.startElementId)) continue;
      seen.add(handle.startElementId);
      const sourceEl = document.getElementById(handle.startElementId);
      if (!sourceEl) continue;
      observer.observe(sourceEl);
      sourceEl.addEventListener('transitionend', recollect);
      sources.push(sourceEl);
    }
    return () => {
      observer.disconnect();
      for (const sourceEl of sources) {
        sourceEl.removeEventListener('transitionend', recollect);
      }
    };
  }, [hoveredLinkId, showAll, visibleHandles]);

  const visibleIds = new Set(visibleHandles.map((handle) => handle.id));

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none"
      style={{ ...TASK_ARROW_LAYER_SHELL_STYLE, zIndex: ZIndex.arrowsHovered }}
    >
      {placedHandles
        .filter((handle) => visibleIds.has(handle.id))
        .map((handle) => (
          <LinkArrowDeleteButton
            key={handle.id}
            fromTaskId={handle.fromTaskId}
            style={{ left: handle.left, top: handle.top }}
            onDelete={() => onDelete(handle.id)}
            onHoverChange={(hovered) => onHoveredLinkIdChange(hovered ? handle.id : null)}
            onSourceHoverEnd={() => onSourceHoverEnd?.()}
          />
        ))}
    </div>
  );
}
