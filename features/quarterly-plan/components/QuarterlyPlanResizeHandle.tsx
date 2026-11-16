'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';

type ResizeHandleSide = 'bottom' | 'left' | 'right';

/** Зона захвата у края и раскладка штрихов грипа; классы целиком, чтобы Tailwind их нашёл. */
const SIDE_LAYOUT: Record<ResizeHandleSide, { grip: string; hit: string; line: string; rounded: string }> = {
  bottom: {
    grip: 'flex-row gap-px',
    hit: 'inset-x-3 bottom-0 h-2 cursor-ns-resize',
    line: 'h-0.5 w-2',
    rounded: '',
  },
  // Боковой грип — штрихи столбиком вдоль края, как на доске спринта.
  left: { grip: 'flex-col gap-0.5', hit: 'inset-y-0 left-0 w-3 cursor-ew-resize', line: 'h-1 w-0.5', rounded: 'rounded-l-[7px]' },
  right: { grip: 'flex-col gap-0.5', hit: 'inset-y-0 right-0 w-3 cursor-ew-resize', line: 'h-1 w-0.5', rounded: 'rounded-r-[7px]' },
};

/** Без своей краски рукоятка берёт цвет текста элемента — остаётся в его тоне. */
const DEFAULT_PAINT = {
  activeBackground: 'color-mix(in srgb, currentColor 26%, transparent)',
  hoverBackground: 'color-mix(in srgb, currentColor 14%, transparent)',
  line: 'color-mix(in srgb, currentColor 70%, transparent)',
};

interface QuarterlyPlanResizeHandleProps {
  /** Сейчас тянут за эту рукоятку: она видна, пока идёт жест. */
  active: boolean;
  /**
   * Узкая зона захвата — у полосы на один день: обычные рукоятки закрыли бы её целиком,
   * а середина нужна, чтобы полосу переносить.
   */
  narrow?: boolean;
  /** Краска листа заметки (`getStickyNoteResizeHandlePaint`); у полос не задаётся. */
  paint?: { activeBackground: string; hoverBackground: string; line: string };
  /** Элемент со скруглёнными углами (полоса): подложка рукоятки повторяет его скругление. */
  rounded?: boolean;
  side: ResizeHandleSide;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Рукоятка у края полосы или заметки, как на доске спринта: видна только под курсором
 * (и пока за неё тянут) — подложка в тон элемента и три штриха грипа.
 */
export function QuarterlyPlanResizeHandle({
  active,
  narrow = false,
  paint = DEFAULT_PAINT,
  rounded = false,
  side,
  onPointerDown,
}: QuarterlyPlanResizeHandleProps) {
  const layout = SIDE_LAYOUT[side];
  return (
    <span className={`group/handle absolute ${layout.hit} ${narrow ? '!w-1.5' : ''}`} onPointerDown={onPointerDown}>
      <span
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${layout.grip} ${rounded ? layout.rounded : ''} ${active ? 'opacity-100' : 'opacity-0 group-hover/handle:opacity-100'}`}
        style={{ backgroundColor: active ? paint.activeBackground : paint.hoverBackground }}
      >
        {[0, 1, 2].map((index) => (
          <span key={index} className={`rounded ${layout.line}`} style={{ backgroundColor: paint.line }} />
        ))}
      </span>
    </span>
  );
}
