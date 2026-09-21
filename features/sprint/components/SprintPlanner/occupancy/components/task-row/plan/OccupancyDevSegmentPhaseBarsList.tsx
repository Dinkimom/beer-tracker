'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { TaskPosition } from '@/types';
import type React from 'react';

import { buildDevSegmentPhaseBarProps } from './occupancyDevSegmentPhaseBarPropsHelpers';
import { OccupancyPhaseBar } from './OccupancyPhaseBar';

interface OccupancyDevSegmentPhaseBarsListProps {
  barsProps: OccupancyPlanPhaseBarsProps;
  cardStyles: { teamBorder: string; teamColor: string };
  devSegmentsSorted: NonNullable<TaskPosition['segments']>;
}

export function OccupancyDevSegmentPhaseBarsList({
  barsProps,
  cardStyles,
  devSegmentsSorted,
}: OccupancyDevSegmentPhaseBarsListProps): React.ReactNode {
  if (!barsProps.position?.segments) return null;

  return devSegmentsSorted.map((seg, idx) => (
    <OccupancyPhaseBar
      key={`dev-seg-${idx}`}
      {...buildDevSegmentPhaseBarProps({
        barsProps,
        cardStyles,
        idx,
        seg,
        segmentCount: devSegmentsSorted.length,
      })}
    />
  ));
}
