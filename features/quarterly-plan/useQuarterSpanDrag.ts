'use client';

import type { QuarterMenuAnchor } from './QuarterlyPlanBoardContext';
import type { BarDragMode, WeekSpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import { useRef, useState } from 'react';

import { applyBarDrag } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

/** Сдвиг курсора, после которого жест — уже перетаскивание, а не клик. */
const CLICK_SLOP_PX = 4;
/** Сдвиг в пикселях, после которого свободный перенос или смена высоты считаются намеренными. */
const FREE_MOVE_THRESHOLD_PX = 6;

/** `height` — тянут за нижний край: срок не меняется, меняется высота (только у заметок). */
type QuarterSpanDragMode = BarDragMode | 'height';

interface QuarterSpanDragState {
  /** Сдвиг в неделях. */
  delta: number;
  /** Сдвиг курсора в пикселях; нули, если свободное движение не отслеживается. */
  dx: number;
  dy: number;
  mode: QuarterSpanDragMode;
}

interface UseQuarterSpanDragOptions {
  /** Следить за сдвигом в пикселях: элемент несут за курсором и меняют ему высоту (заметки). */
  free?: boolean;
  span: WeekSpan;
  weekCount: number;
  /** Жест закончился сдвигом; `pointer` — где отпустили, `drag` — итог жеста. */
  onChange: (span: WeekSpan, pointer: QuarterMenuAnchor, drag: QuarterSpanDragState) => void;
  /** Нажали и отпустили, не сдвинув курсор. */
  onClick: (pointer: QuarterMenuAnchor) => void;
  /** Жест закончился или прерван — снять превью. */
  onEnd?: () => void;
  /** Курсор сдвинулся во время жеста — обновить превью. */
  onMove?: (span: WeekSpan, pointer: QuarterMenuAnchor, drag: QuarterSpanDragState) => void;
}

/**
 * Перетаскивание элемента таймлайна (полосы назначения, заметки): целиком и за края, шаг — неделя.
 * Ширину недели берёт у ближайшего `[data-quarter-track]`. `rootProps` делают элемент кнопкой:
 * клик без сдвига и Enter вызывают `onClick`.
 */
export function useQuarterSpanDrag({
  free = false,
  span,
  weekCount,
  onChange,
  onClick,
  onEnd,
  onMove,
}: UseQuarterSpanDragOptions) {
  const rootRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ moved: boolean; weekPx: number; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<QuarterSpanDragState | null>(null);

  const spanAfter = (state: Pick<QuarterSpanDragState, 'delta' | 'mode'>): WeekSpan =>
    state.mode === 'height' ? span : applyBarDrag(span, state.mode, state.delta, weekCount);

  const begin = (mode: QuarterSpanDragMode) => (event: ReactPointerEvent<HTMLElement>) => {
    const root = rootRef.current;
    const track = root?.closest<HTMLElement>('[data-quarter-track]');
    if (event.button !== 0 || !root || !track) return;
    event.stopPropagation();
    root.setPointerCapture(event.pointerId);
    originRef.current = {
      moved: false,
      weekPx: track.getBoundingClientRect().width / weekCount,
      x: event.clientX,
      y: event.clientY,
    };
    setDrag({ delta: 0, dx: 0, dy: 0, mode });
  };

  const end = () => {
    originRef.current = null;
    setDrag(null);
    onEnd?.();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = originRef.current;
    if (!origin || !drag) return;
    // Потянули и вернули на место — это отменённое перетаскивание, меню по нему не открываем.
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > CLICK_SLOP_PX) origin.moved = true;
    const delta = Math.round((event.clientX - origin.x) / origin.weekPx);
    const dx = free ? event.clientX - origin.x : 0;
    const dy = free ? event.clientY - origin.y : 0;
    if (drag.delta === delta && drag.dx === dx && drag.dy === dy) return;
    const next = { ...drag, delta, dx, dy };
    setDrag(next);
    onMove?.(spanAfter(next), { x: event.clientX, y: event.clientY }, next);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = originRef.current;
    if (!origin || !drag) return;
    end();
    const pointer = { x: event.clientX, y: event.clientY };
    const movedFreely = Math.hypot(drag.dx, drag.dy) > FREE_MOVE_THRESHOLD_PX;
    if (drag.delta !== 0 || movedFreely) {
      onChange(spanAfter(drag), pointer, drag);
    } else if (drag.mode === 'move' && !origin.moved) {
      onClick(pointer);
    }
  };

  return {
    /** Начать растягивание за край: `onPointerDown` ручки. */
    begin,
    drag,
    rootProps: {
      onClick: (event: ReactMouseEvent<HTMLElement>) => event.stopPropagation(),
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        onClick({ x: rect.left, y: rect.bottom });
      },
      onPointerCancel: end,
      onPointerDown: begin('move'),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      role: 'button',
      tabIndex: 0,
    },
    rootRef,
    /** Срок с учётом идущего перетаскивания. */
    span: drag ? spanAfter(drag) : span,
  };
}
