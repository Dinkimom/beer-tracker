'use client';

import { useContext, useEffect, useRef } from 'react';

import { SwimlaneArrowRedrawContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';

interface SwimlanePinnedArrowSyncProps {
  active: boolean;
  redrawRef: { current: (() => void) | null };
}

/** Перерисовка стрелок, когда закреплённая строка залипает и карточки едут отдельно от общего слоя. */
export function SwimlanePinnedArrowSync({ active, redrawRef }: SwimlanePinnedArrowSyncProps) {
  const redraw = useContext(SwimlaneArrowRedrawContext);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    redrawRef.current = redraw ?? null;
    return () => {
      redrawRef.current = null;
    };
  }, [redraw, redrawRef]);

  useEffect(() => {
    if (!active || redraw == null) return undefined;
    const scroller = anchorRef.current?.closest('.planner-board-scroll');
    if (!(scroller instanceof HTMLElement)) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        redraw();
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [active, redraw]);

  return <span ref={anchorRef} className="hidden" />;
}
