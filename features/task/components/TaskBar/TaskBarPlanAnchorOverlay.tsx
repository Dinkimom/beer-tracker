'use client';

import type { SegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';

import { CARD_MARGIN } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
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
  'bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgb(217_119_6/0.18)_4px,rgb(217_119_6/0.18)_7px)] dark:bg-[repeating-linear-gradient(135deg,transparent,transparent_4px,rgb(251_191_36/0.2)_4px,rgb(251_191_36/0.2)_7px)]';

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
  const { t } = useI18n();
  if (!overlay || hidden) return null;
  const liveDuration = resizing ? (resizePreviewDuration ?? duration) : duration;
  const costHatchFrom = planAnchorHatchStartFraction(overlay.baseCells, liveDuration);
  if (costHatchFrom == null) return null;
  return (
    <div
      aria-label={t('sprintPlanner.swimlane.planAnchorCostAdded')}
      className={`pointer-events-none absolute inset-y-0 right-0 z-[1] ${PLAN_ANCHOR_HATCH_CLASS} ${
        costHatchFrom <= 0 ? 'rounded-lg' : 'rounded-r-lg'
      }`}
      role="img"
      style={{
        // Ширина карточки = длина × ячейка − 2 × CARD_MARGIN: ставим границу на линию сетки, а не на долю карточки.
        left:
          costHatchFrom <= 0
            ? 0
            : `calc((100% + ${CARD_MARGIN * 2}px) * ${costHatchFrom} - ${CARD_MARGIN}px)`,
      }}
    />
  );
}
