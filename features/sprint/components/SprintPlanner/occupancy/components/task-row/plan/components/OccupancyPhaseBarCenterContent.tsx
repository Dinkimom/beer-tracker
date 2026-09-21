import type { OccupancyPhaseBarProps } from '../occupancyPhaseBar.types';

import { resolveOccupancyPhaseBarCenterContent } from './occupancyPhaseBarCenterContentResolveHelpers';

interface OccupancyPhaseBarCenterContentProps {
  avatarUrl?: string | null;
  badgeClass?: string;
  compactRowMode: boolean;
  forceReleaseStyle: boolean;
  hideCenterContent?: boolean;
  initials: string;
  isNarrow: boolean;
  phaseDateRangeLabel?: string;
  phaseDurationLabel?: string;
  plannedInSprintVariant: boolean;
  position: OccupancyPhaseBarProps['position'];
  showToolsEmoji: boolean;
  teamPlanVariant: boolean;
}

export function OccupancyPhaseBarCenterContent(props: OccupancyPhaseBarCenterContentProps) {
  return resolveOccupancyPhaseBarCenterContent(props);
}
