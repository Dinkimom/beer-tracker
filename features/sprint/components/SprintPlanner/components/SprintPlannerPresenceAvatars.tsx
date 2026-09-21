'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { Avatar } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
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
  'sprint-presence-avatar group/slot relative z-0 inline-flex -ml-2 first:ml-0 hover:z-20 hover:scale-110 hover:shadow-md group-hover/presence:-ml-0.5 first:group-hover/presence:ml-0';

const AVATAR_RING_CLASS =
  'ring-2 ring-white group-hover/slot:ring-blue-600 dark:ring-gray-800 dark:group-hover/slot:ring-blue-400';

interface SprintPlannerPresenceAvatarsProps {
  viewers: readonly SprintPresenceViewer[];
  onRevealViewer?: (viewer: SprintPresenceViewer) => void;
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
  const extraNames = extra.map((viewer) => sprintPresenceLabelName(viewer, anonymousLabel)).join(', ');

  return (
    <div
      aria-label={t('sprintPlanner.presence.ariaLabel', { names: names.join(', ') })}
      className="group/presence flex shrink-0 items-center pr-1"
      role="group"
    >
      {shown.map((viewer) => {
        const name = sprintPresenceLabelName(viewer, anonymousLabel);
        const actionKey = sprintPresenceFocusActionKey(viewer.focus?.state);
        const tooltip = formatSprintPresenceViewerTooltip({
          action: actionKey ? t(PRESENCE_ACTION_KEYS[actionKey]) : null,
          name,
          view: viewer.boardView ? t(PRESENCE_VIEW_KEYS[viewer.boardView]) : null,
        });
        const canReveal = Boolean(onRevealViewer) && canRevealSprintPresenceViewer(viewer);
        const avatar = (
          <Avatar
            avatarUrl={viewer.avatarUrl}
            className={AVATAR_RING_CLASS}
            initials={getInitials(name)}
            size="md"
          />
        );
        return (
          <TextTooltip key={sprintPresenceViewerReactKey(viewer)} content={tooltip} delayDuration={80} side="bottom">
            {canReveal ? (
              <button
                aria-label={t('sprintPlanner.presence.revealAria', { name })}
                className={`${AVATAR_SLOT_CLASS} cursor-pointer border-0 bg-transparent p-0`}
                type="button"
                onClick={() => onRevealViewer?.(viewer)}
              >
                {avatar}
              </button>
            ) : (
              <span className={`${AVATAR_SLOT_CLASS} cursor-default`}>{avatar}</span>
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
