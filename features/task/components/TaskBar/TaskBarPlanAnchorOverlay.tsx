'use client';

import type { SegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';

import { CARD_MARGIN, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { formatOverdueDayAmount } from '@/features/swimlane/utils/overdueBaselineSummary';
import { planAnchorHatchStartFraction } from '@/features/swimlane/utils/planAnchorShift';

interface TaskBarPlanAnchorOverlayProps {
  /** Сохранённая длина отрезка в ячейках. */
  duration: number;
  /** Во время drag и раскрытия по долгому hover ширина карточки не равна её длине. */
  hidden: boolean;
  overlay: SegmentPlanAnchorOverlay | null | undefined;
  /** Длина отрезка в превью ресайза — штриховка пересчитывается на лету. */
  resizePreviewDuration: number | null | undefined;
  resizing: boolean;
}

const PLAN_ANCHOR_HATCH_CLASS =
  'bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(217_119_6/0.13)_6px,rgb(217_119_6/0.13)_8px)] dark:bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(251_191_36/0.15)_6px,rgb(251_191_36/0.15)_8px)]';

/**
 * Штриховка стоимости, добавленной после старта работы: хвост карточки сверх исходной длины.
 * Без pointer-events — drag и hover остаются у карточки.
 */
export function TaskBarPlanAnchorOverlay({
  duration,
  hidden,
  overlay,
  resizePreviewDuration,
  resizing,
}: TaskBarPlanAnchorOverlayProps) {
  const { language, t } = useI18n();
  if (!overlay || hidden) return null;
  const liveDuration = resizing ? (resizePreviewDuration ?? duration) : duration;
  const costHatchFrom = planAnchorHatchStartFraction(overlay.baseCells, liveDuration);
  if (costHatchFrom == null) return null;
  const days = formatOverdueDayAmount(
    liveDuration - Math.max(0, overlay.baseCells),
    getPartsPerDay(),
    language === 'ru' ? ',' : '.'
  );
  return (
    <div
      aria-label={t('sprintPlanner.swimlane.planAnchorCostAdded', { days })}
      className={`pointer-events-none absolute inset-y-0 right-0 z-[1] ${PLAN_ANCHOR_HATCH_CLASS} ${
        costHatchFrom <= 0
          ? 'rounded-lg'
          : 'rounded-r-lg border-l border-dashed border-amber-500/60 dark:border-amber-400/50'
      }`}
      role="img"
      style={{
        // Ширина карточки = длина × ячейка − 2 × CARD_MARGIN: ставим границу на линию сетки, а не на долю карточки.
        left:
          costHatchFrom <= 0
            ? 0
            : `calc((100% + ${CARD_MARGIN * 2}px) * ${costHatchFrom} - ${CARD_MARGIN}px)`,
      }}
    >
      <span className="absolute right-1.5 bottom-1.5 rounded border border-amber-200 bg-amber-50/95 px-1 text-[10px] leading-4 font-semibold whitespace-nowrap text-amber-700 tabular-nums dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-300">
        {t('sprintPlanner.swimlane.planAnchorCostAddedBadge', { days })}
      </span>
    </div>
  );
}
