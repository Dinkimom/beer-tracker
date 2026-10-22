'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { CSSProperties } from 'react';

import { Avatar } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { isSprintPresenceViewerIdle } from '@/lib/realtime/sprintPresenceAttention';
import {
  canRevealSprintPresenceViewer,
  formatSprintPresenceViewerTooltip,
  sprintPresenceFocusActionKey,
} from '@/lib/realtime/sprintPresenceBoardView';
import {
  collapseSprintPresenceViewers,
  sprintPresenceAvatarMinCount,
  sprintPresenceDisplayName,
  sprintPresenceViewerReactKey,
} from '@/lib/realtime/sprintPresenceCollapse';
import {
  SPRINT_PRESENCE_COLOR_CSS_VAR,
  sprintPresenceColorSlots,
  sprintPresenceViewerColor,
} from '@/lib/realtime/sprintPresenceColor';
import { getInitials } from '@/utils/displayUtils';

const MAX_VISIBLE_AVATARS = 4;

const PRESENCE_ACTION_KEYS = {
  dragging: 'sprintPlanner.presence.actionDragging',
  editing: 'sprintPlanner.presence.actionEditing',
  linking: 'sprintPlanner.presence.actionLinking',
  resizing: 'sprintPlanner.presence.actionResizing',
  viewing: 'sprintPlanner.presence.actionViewing',
} as const;

const PRESENCE_VIEW_KEYS = {
  kanban: 'sprintPlanner.presence.boardViewKanban',
  occupancy: 'sprintPlanner.presence.boardViewOccupancy',
  retro: 'sprintPlanner.presence.boardViewRetro',
  swimlanes: 'sprintPlanner.presence.boardViewSwimlanes',
} as const;

export function splitSprintPresenceAvatars(
  viewers: readonly SprintPresenceViewer[],
  maxVisible = MAX_VISIBLE_AVATARS
): { extra: SprintPresenceViewer[]; shown: SprintPresenceViewer[] } {
  if (viewers.length <= maxVisible) {
    return { extra: [], shown: [...viewers] };
  }
  return { extra: [...viewers.slice(maxVisible)], shown: [...viewers.slice(0, maxVisible)] };
}

export function sprintPresenceLabelName(viewer: SprintPresenceViewer, anonymousLabel: string): string {
  return sprintPresenceDisplayName(viewer, anonymousLabel);
}

/** Стек только когда на доске уже двое: одного себя не показываем. */
export function shouldShowSprintPresenceAvatars(viewers: readonly SprintPresenceViewer[]): boolean {
  return collapseSprintPresenceViewers(viewers).length >= sprintPresenceAvatarMinCount();
}

const AVATAR_SLOT_CLASS =
  'sprint-presence-avatar group/slot relative z-0 inline-flex -ml-2 transition-all duration-200 first:ml-0 hover:z-20 hover:scale-110 hover:shadow-md group-hover/presence:-ml-0.5 first:group-hover/presence:ml-0';

const AVATAR_RING_CLASS = 'ring-2 ring-white dark:ring-gray-800';

/** Кольцо цветом участника: тем же цветом его обводка на карточке и вспышка перехода. */
const AVATAR_PRESENCE_RING_CLASS = 'ring-2 ring-[var(--sprint-presence-color)]';

interface SprintPlannerPresenceAvatarsProps {
  viewers: readonly SprintPresenceViewer[];
  onRevealViewer?: (viewer: SprintPresenceViewer, color: string) => void;
}

export function SprintPlannerPresenceAvatars({
  viewers,
  onRevealViewer,
}: SprintPlannerPresenceAvatarsProps) {
  const { t } = useI18n();
  const uniqueViewers = collapseSprintPresenceViewers(viewers);
  if (!shouldShowSprintPresenceAvatars(uniqueViewers)) {
    return null;
  }
  const anonymousLabel = t('sprintPlanner.presence.anonymous');
  const names = uniqueViewers.map((viewer) => sprintPresenceLabelName(viewer, anonymousLabel));
  const { extra, shown } = splitSprintPresenceAvatars(uniqueViewers);
  const colorSlots = sprintPresenceColorSlots(uniqueViewers);
  const extraNames = extra.map((viewer) => sprintPresenceLabelName(viewer, anonymousLabel)).join(', ');

  return (
    <div
      aria-label={t('sprintPlanner.presence.ariaLabel', { names: names.join(', ') })}
      className="group/presence flex shrink-0 items-center pr-1"
      role="group"
    >
      {shown.map((viewer) => {
        const name = sprintPresenceLabelName(viewer, anonymousLabel);
        const idle = isSprintPresenceViewerIdle(viewer.attention);
        const actionKey = idle ? null : sprintPresenceFocusActionKey(viewer.focus?.state);
        const tooltip = formatSprintPresenceViewerTooltip({
          action: actionKey ? t(PRESENCE_ACTION_KEYS[actionKey]) : null,
          name,
          view: viewer.boardView ? t(PRESENCE_VIEW_KEYS[viewer.boardView]) : null,
        });
        const canReveal = Boolean(onRevealViewer) && canRevealSprintPresenceViewer(viewer);
        const idleClass = idle ? 'opacity-40' : 'opacity-100';
        const color = sprintPresenceViewerColor(colorSlots, viewer);
        const colorStyle = { [SPRINT_PRESENCE_COLOR_CSS_VAR]: color } as CSSProperties;
        const avatar = (
          <Avatar
            avatarUrl={viewer.avatarUrl}
            className={AVATAR_PRESENCE_RING_CLASS}
            initials={getInitials(name)}
            size="md"
          />
        );
        return (
          <TextTooltip key={sprintPresenceViewerReactKey(viewer)} content={tooltip} delayDuration={80} side="bottom">
            {canReveal ? (
              <button
                aria-label={t('sprintPlanner.presence.revealAria', { name })}
                className={`${AVATAR_SLOT_CLASS} ${idleClass} cursor-pointer border-0 bg-transparent p-0 active:scale-[0.98]`}
                style={colorStyle}
                type="button"
                onClick={() => onRevealViewer?.(viewer, color)}
              >
                {avatar}
              </button>
            ) : (
              <span className={`${AVATAR_SLOT_CLASS} ${idleClass} cursor-default`} style={colorStyle}>
                {avatar}
              </span>
            )}
          </TextTooltip>
        );
      })}
      {extra.length > 0 ? (
        <TextTooltip content={extraNames} delayDuration={80} side="bottom">
          <span
            className={`${AVATAR_SLOT_CLASS} h-7 min-h-7 min-w-7 cursor-default items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200 ${AVATAR_RING_CLASS}`}
          >
            {t('sprintPlanner.presence.overflow', { count: extra.length })}
          </span>
        </TextTooltip>
      ) : null}
    </div>
  );
}
