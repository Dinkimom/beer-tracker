'use client';

import type { AvailabilitySegment } from '@/lib/boardAvailability/availabilitySegments';

import { useI18n } from '@/contexts/LanguageContext';
import { availabilityKindMessageKey } from '@/lib/boardAvailability/availabilityCardKind';

import { SwimlaneAvailabilityChip } from './SwimlaneAvailabilityChip';

interface SwimlaneAvailabilityChipsProps {
  dayCount: number;
  segments: AvailabilitySegment[];
  /** Низ зоны карточек (с полоской под лейбл, если под ним карточка): чип стоит внизу, над дорожкой факта */
  taskBandHeight: number;
  onChipClick: (eventId: string) => void;
}

const CHIP_HEIGHT_PX = 20;
const CHIP_BOTTOM_GAP_PX = 4;

export function SwimlaneAvailabilityChips({
  dayCount,
  segments,
  taskBandHeight,
  onChipClick,
}: SwimlaneAvailabilityChipsProps) {
  const { t } = useI18n();
  if (segments.length === 0 || dayCount < 1) {
    return null;
  }

  const topPx = Math.max(4, taskBandHeight - CHIP_HEIGHT_PX - CHIP_BOTTOM_GAP_PX);
  const dayWidthPercent = 100 / dayCount;

  return (
    <>
      {segments.map((segment) => {
        const kindLabel = t(availabilityKindMessageKey(segment.kind));
        const label = t('sprintPlanner.swimlane.availability.chipLabel', {
          label: kindLabel,
          range: segment.dateRangeLabel,
        });
        return (
          <SwimlaneAvailabilityChip
            key={segment.eventId}
            kind={segment.kind}
            label={label}
            leftPercent={(segment.startDay / dayCount) * 100}
            maxWidthPercent={dayWidthPercent}
            topPx={topPx}
            onClick={() => onChipClick(segment.eventId)}
          />
        );
      })}
    </>
  );
}
