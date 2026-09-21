'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';

import { useOccupancyScroll } from '../../OccupancyScrollCtx';

import { computeOccupancyRowScrollArrowVisibility } from './occupancyRowScrollArrowsHelpers';

const ROW_ARROW_BUTTON_SIZE = 28;

const ROW_ARROW_BTN_CLS =
  'pointer-events-auto !flex !h-7 !w-7 !min-h-0 !min-w-0 !items-center !justify-center !rounded-full !border-gray-200 !bg-white !p-0 shadow-md hover:!shadow-lg hover:!bg-gray-50 dark:!border-gray-600 dark:!bg-gray-700 dark:hover:!bg-gray-600';

interface OccupancyRowScrollArrowsProps {
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  planPhasesRef: React.RefObject<HTMLDivElement | null>;
  taskColumnWidth: number;
}

/**
 * Кнопки быстрого скролла к фазе строки, когда та выходит за пределы видимой области.
 * Видимость определяется через getBoundingClientRect() реальных DOM-элементов [data-occupancy-bar]
 * в planPhasesRef.
 */
export function OccupancyRowScrollArrows({
  phaseBarHeightPx,
  phaseBarTopOffsetPx,
  planPhasesRef,
  taskColumnWidth,
}: OccupancyRowScrollArrowsProps) {
  const { scrollContainerRef, scrollTo } = useOccupancyScroll();
  const rowArrowButtonTop = phaseBarTopOffsetPx + phaseBarHeightPx / 2 - ROW_ARROW_BUTTON_SIZE / 2;

  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const targetLeftRef = useRef(0);
  const targetRightRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const phasesEl = planPhasesRef.current;
    if (!container || !phasesEl) return;

    const computeVisibility = () => {
      const bars = Array.from(phasesEl.querySelectorAll<HTMLElement>('[data-occupancy-bar]'));
      const visibility = computeOccupancyRowScrollArrowVisibility({
        bars,
        container,
        containerScrollLeft: container.scrollLeft,
        taskColumnWidth,
      });

      targetLeftRef.current = visibility.targetLeft;
      targetRightRef.current = visibility.targetRight;
      setShowLeft(visibility.showLeft);
      setShowRight(visibility.showRight);
    };

    let rafId: number | null = null;
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        computeVisibility();
      });
    };

    computeVisibility();
    container.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(container);

    return () => {
      container.removeEventListener('scroll', schedule);
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [scrollContainerRef, planPhasesRef, taskColumnWidth]);

  if (!showLeft && !showRight) return null;

  return (
    <>
      {showLeft && (
        <div
          style={{
            position: 'sticky',
            left: taskColumnWidth + 4,
            width: 0,
            height: 0,
            overflow: 'visible',
            zIndex: ZIndex.rowScrollArrow,
            pointerEvents: 'none',
          }}
        >
          <Button
            className={ROW_ARROW_BTN_CLS}
            style={{
              position: 'absolute',
              top: rowArrowButtonTop,
              left: 0,
              width: ROW_ARROW_BUTTON_SIZE,
              height: ROW_ARROW_BUTTON_SIZE,
            }}
            title="Прокрутить к фазе"
            type="button"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              scrollTo(targetLeftRef.current);
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-300" name="chevron-left" />
          </Button>
        </div>
      )}
      {showRight && (
        <div
          style={{
            width: '100%',
            height: 0,
            overflow: 'visible',
            display: 'flex',
            justifyContent: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'sticky',
              right: 4,
              width: 0,
              height: 0,
              overflow: 'visible',
              zIndex: ZIndex.rowScrollArrow,
              pointerEvents: 'none',
            }}
          >
            <Button
              className={ROW_ARROW_BTN_CLS}
              style={{
                position: 'absolute',
                top: rowArrowButtonTop,
                right: 0,
                width: ROW_ARROW_BUTTON_SIZE,
                height: ROW_ARROW_BUTTON_SIZE,
              }}
              title="Прокрутить к фазе"
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                scrollTo(targetRightRef.current);
              }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-300" name="chevron-right" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
