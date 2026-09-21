'use client';

import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';

import { useI18n } from '@/contexts/LanguageContext';
import { availabilityKindMessageKey } from '@/features/swimlane/utils/availabilityCardKind';

import { SwimlaneAvailabilityChip } from './SwimlaneAvailabilityChip';

interface SwimlaneAvailabilityChipsProps {
  dayCount: number;
  mainAreaHeight: number;
  segments: AvailabilitySegment[];
  onChipClick: (eventId: string) => void;
}

const CHIP_HEIGHT_PX = 20;
const CHIP_BOTTOM_GAP_PX = 4;

export function SwimlaneAvailabilityChips({
  dayCount,
  mainAreaHeight,
  segments,
  onChipClick,
}: SwimlaneAvailabilityChipsProps) {
  const { t } = useI18n();
  if (segments.length === 0 || dayCount < 1) {
    return null;
  }

  const topPx = Math.max(4, mainAreaHeight - CHIP_HEIGHT_PX - CHIP_BOTTOM_GAP_PX);
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
