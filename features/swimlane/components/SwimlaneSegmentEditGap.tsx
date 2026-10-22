'use client';

import type { SegmentEditGapDragMode } from '@/features/swimlane/hooks/useSegmentEditGapDrag';

import { useI18n } from '@/contexts/LanguageContext';

const RING_HATCH =
  'bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(59_130_246/0.28)_3px,rgb(59_130_246/0.28)_6px)] dark:bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(96_165_250/0.32)_3px,rgb(96_165_250/0.32)_6px)]';
const RING_HATCH_ACTIVE =
  'bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(59_130_246/0.42)_3px,rgb(59_130_246/0.42)_6px)] dark:bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgb(96_165_250/0.48)_3px,rgb(96_165_250/0.48)_6px)]';

const EDGE_LINE_CLASS =
  'pointer-events-none absolute top-0 bottom-0 w-0 border-l-2 border-dashed transition-[border-color] duration-200';

const BODY_CLASS =
  'absolute inset-0 cursor-grab rounded-sm border-0 p-0 transition-colors duration-200 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400';

/** Hit-зона правого края: тянуть — длина разрыва. */
const RESIZE_HANDLE_CLASS =
  'group/handle absolute top-0 bottom-0 right-0 z-[1] flex w-3 translate-x-1/2 cursor-ew-resize items-center justify-center rounded-sm border-0 bg-transparent p-0 transition-colors duration-200 hover:bg-blue-500/15 active:bg-blue-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-400/20 dark:active:bg-blue-400/30 dark:focus-visible:ring-blue-400';

const LENGTH_CHIP_CLASS =
  'pointer-events-none absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-blue-600 px-1 py-px text-[10px] font-semibold leading-tight text-white shadow-sm dark:bg-blue-500';

const ARROW_DELTA: Partial<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

interface SwimlaneSegmentEditGapProps {
  /** Наведение или перетаскивание — подсветка и подпись длины. */
  active: boolean;
  leftPercent: number;
  lengthLabel: string;
  widthPercent: number;
  onDragStart: (event: React.PointerEvent, mode: SegmentEditGapDragMode) => void;
  onHoverChange: (hovered: boolean) => void;
  onNudge: (mode: SegmentEditGapDragMode, delta: number) => void;
  /** Клик по телу разрыва; вызывающий сам отсекает click после drag. */
  onRemoveClick: () => void;
  onResizeHandleClick: () => void;
}

/** Клик мышью не уводит фокус на разрыв: иначе Enter после drag не сохранит правку. */
function keepFocusOnMouseDown(event: React.MouseEvent): void {
  event.preventDefault();
}

function handleArrowNudge(
  event: React.KeyboardEvent,
  mode: SegmentEditGapDragMode,
  onNudge: SwimlaneSegmentEditGapProps['onNudge']
): void {
  const delta = ARROW_DELTA[event.key];
  if (delta == null) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  onNudge(mode, delta);
}

/** Разрыв между отрезками: тело тянется (сдвиг) и кликается (убрать), правый край — длина. */
export function SwimlaneSegmentEditGap({
  active,
  lengthLabel,
  leftPercent,
  widthPercent,
  onDragStart,
  onHoverChange,
  onNudge,
  onRemoveClick,
  onResizeHandleClick,
}: SwimlaneSegmentEditGapProps) {
  const { t } = useI18n();
  const lineColor = active
    ? 'border-blue-600 dark:border-blue-300'
    : 'border-blue-500 dark:border-blue-400';
  const moveLabel = t('sprintPlanner.occupancy.segmentGapMove');
  const resizeLabel = t('sprintPlanner.occupancy.segmentGapResize');

  return (
    <div
      className="absolute top-0 bottom-0 z-[2]"
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <button
        aria-label={moveLabel}
        className={`${BODY_CLASS} ${active ? RING_HATCH_ACTIVE : RING_HATCH}`}
        title={moveLabel}
        type="button"
        onBlur={() => onHoverChange(false)}
        onClick={onRemoveClick}
        onFocus={() => onHoverChange(true)}
        onKeyDown={(event) => handleArrowNudge(event, 'move', onNudge)}
        onMouseDown={keepFocusOnMouseDown}
        onPointerDown={(event) => onDragStart(event, 'move')}
      >
        <span aria-hidden className={`${EDGE_LINE_CLASS} left-0 ${lineColor}`} />
      </button>
      <button
        aria-label={resizeLabel}
        className={RESIZE_HANDLE_CLASS}
        title={resizeLabel}
        type="button"
        onBlur={() => onHoverChange(false)}
        onClick={onResizeHandleClick}
        onFocus={() => onHoverChange(true)}
        onKeyDown={(event) => handleArrowNudge(event, 'resize', onNudge)}
        onMouseDown={keepFocusOnMouseDown}
        onPointerDown={(event) => onDragStart(event, 'resize')}
      >
        <span aria-hidden className={`${EDGE_LINE_CLASS} left-1/2 -translate-x-px ${lineColor}`} />
        <span
          aria-hidden
          className={`relative h-4 w-1 rounded-full bg-blue-500 shadow-sm transition-opacity duration-200 dark:bg-blue-400 ${
            active ? 'opacity-100' : 'opacity-0 group-hover/handle:opacity-100'
          }`}
        />
      </button>
      {active ? <span className={LENGTH_CHIP_CLASS}>{lengthLabel}</span> : null}
    </div>
  );
}
