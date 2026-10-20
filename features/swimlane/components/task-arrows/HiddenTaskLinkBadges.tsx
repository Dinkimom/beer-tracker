'use client';

import { useContext, useLayoutEffect, useRef, useState } from 'react';

import { CardLinkIcon } from '@/components/CardLinkIcon';
import { ZIndex } from '@/constants';
import { SwimlaneArrowRedrawGenerationContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { TASK_ARROW_LAYER_SHELL_STYLE } from '@/features/swimlane/utils/task-arrows/taskArrowsLayerStyle';

interface PlacedBadge {
  count: number;
  left: number;
  taskId: string;
  top: number;
}

/** Бейдж заходит на правый верхний угол карточки. */
const BADGE_OFFSET_PX = 6;

function collectPlacedBadges(
  counts: Map<string, number>,
  overlay: HTMLDivElement
): PlacedBadge[] {
  const overlayRect = overlay.getBoundingClientRect();
  const next: PlacedBadge[] = [];
  for (const [taskId, count] of counts) {
    const card = document.getElementById(`task-${taskId}`);
    if (!card) continue;
    const rect = card.getBoundingClientRect();
    next.push({
      count,
      left: Math.round(rect.right - overlayRect.left - BADGE_OFFSET_PX),
      taskId,
      top: Math.round(rect.top - overlayRect.top - BADGE_OFFSET_PX),
    });
  }
  return next;
}

/**
 * Счётчик связей, скрытых в покое (режим «Важные» / «При наведении»):
 * видно, что у карточки есть связи, без линий через всю доску.
 */
export function HiddenTaskLinkBadges({ counts }: { counts: Map<string, number> }) {
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<PlacedBadge[]>([]);
  /** `counts` пересобирается каждый рендер — перемеряем только по содержимому. */
  const countsRef = useRef(counts);
  const countsKey = Array.from(counts, ([id, count]) => `${id}:${count}`).join('|');

  useLayoutEffect(() => {
    countsRef.current = counts;
  });

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    setPlaced(collectPlacedBadges(countsRef.current, overlay));
  }, [countsKey, redrawGeneration]);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none"
      style={{ ...TASK_ARROW_LAYER_SHELL_STYLE, zIndex: ZIndex.arrowsHovered }}
    >
      {placed.map((badge) => (
        <span
          key={badge.taskId}
          className="absolute flex h-4 -translate-x-1/2 items-center gap-0.5 rounded-full border border-ds-border-subtle bg-ds-canvas px-1 text-[10px] font-medium leading-none text-ds-text-muted shadow-sm"
          style={{ left: badge.left, top: badge.top }}
        >
          <CardLinkIcon className="h-2.5 w-2.5 shrink-0" />
          {badge.count}
        </span>
      ))}
    </div>
  );
}
