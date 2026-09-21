import type { OccupancyPhaseBarProps } from '../occupancyPhaseBar.types';
import type { ReactNode } from 'react';

import { Avatar } from '@/components/Avatar';

import { PhaseBarTaskLink } from './PhaseBarTaskLink';

function renderOccupancyPhaseBarTextLabel(label: string): ReactNode {
  return (
    <span
      aria-hidden
      className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
    >
      {label}
    </span>
  );
}

function resolveOccupancyPhaseBarAvatarSize(
  compactRowMode: boolean,
  isNarrow: boolean
): 'md' | 'sm' | 'xs' {
  if (compactRowMode) return 'xs';
  if (isNarrow) return 'sm';
  return 'md';
}

interface CenterContentInput {
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

function tryRenderPlannedSprintLink(input: CenterContentInput): ReactNode | undefined {
  if (!input.plannedInSprintVariant) return undefined;
  if (input.position.sourceTaskId) return <PhaseBarTaskLink position={input.position} />;
  return null;
}

function tryRenderPhaseTextLabel(input: CenterContentInput): ReactNode | undefined {
  if (input.phaseDateRangeLabel) return renderOccupancyPhaseBarTextLabel(input.phaseDateRangeLabel);
  if (input.phaseDurationLabel) return renderOccupancyPhaseBarTextLabel(input.phaseDurationLabel);
  return undefined;
}

export function resolveOccupancyPhaseBarCenterContent(input: CenterContentInput): ReactNode {
  if (input.hideCenterContent) return null;
  if (input.forceReleaseStyle) {
    return (
      <span aria-hidden className="text-lg leading-none">
        🚀
      </span>
    );
  }

  const planned = tryRenderPlannedSprintLink(input);
  if (planned !== undefined) return planned;

  const textLabel = tryRenderPhaseTextLabel(input);
  if (textLabel !== undefined) return textLabel;

  if (input.teamPlanVariant || input.showToolsEmoji) {
    return (
      <span aria-hidden className="text-sm leading-none">
        🔧
      </span>
    );
  }

  const avatarSize = resolveOccupancyPhaseBarAvatarSize(input.compactRowMode, input.isNarrow);
  return (
    <Avatar
      avatarUrl={input.avatarUrl ?? undefined}
      initials={input.initials}
      initialsClassName={
        input.badgeClass ??
        'bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700'
      }
      size={avatarSize}
    />
  );
}
