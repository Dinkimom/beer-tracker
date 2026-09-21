'use client';

import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { AnimationEvent } from 'react';

import { useCallback, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { mergeSprintCardPresenceAvatarSlots, nextSprintCardPresenceAvatarState } from '@/lib/realtime/sprintCardPresence';
import { sprintPresenceDisplayName, sprintPresenceViewerReactKey } from '@/lib/realtime/sprintPresenceCollapse';
import { getInitials } from '@/utils/displayUtils';

import { useSprintCardPresenceViewers } from './SprintCardPresenceContext';

const MAX_VISIBLE = 3;
const PRESENCE_EXIT_ANIMATION = 'sprint-card-presence-exit';

const AVATAR_SLOT_CLASS = 'sprint-card-presence-avatar inline-flex rounded-full';

const AVATAR_RING_CLASS = 'ring-2 ring-white dark:ring-gray-800';

const CARD_PRESENCE_TOOLTIP_KEYS = {
  dragging: 'sprintPlanner.presence.cardDragging',
  editing: 'sprintPlanner.presence.cardEditing',
  linking: 'sprintPlanner.presence.cardLinking',
  resizing: 'sprintPlanner.presence.cardResizing',
  viewing: 'sprintPlanner.presence.cardViewing',
} as const;

function cardPresenceTooltip(
  viewer: SprintPresenceViewer,
  name: string,
  t: (key: string, params?: Record<string, string>) => string
): string {
  const state = viewer.focus?.state ?? 'viewing';
  return t(CARD_PRESENCE_TOOLTIP_KEYS[state], { name });
}

function handlePresenceExitAnimationEnd(
  event: AnimationEvent<HTMLSpanElement>,
  isExiting: boolean,
  key: string,
  onExitAnimationEnd: (key: string) => void
): void {
  if (isExiting && event.animationName === PRESENCE_EXIT_ANIMATION) {
    onExitAnimationEnd(key);
  }
}

function useExitingSprintCardPresenceViewers(live: readonly SprintPresenceViewer[]): {
  exiting: SprintPresenceViewer[];
  onExitAnimationEnd: (key: string) => void;
  orderKeys: string[];
} {
  const liveSignature = live.map(sprintPresenceViewerReactKey).join('\0');
  const [state, setState] = useState<{
    exiting: SprintPresenceViewer[];
    live: readonly SprintPresenceViewer[];
    orderKeys: string[];
    signature: string;
  }>({
    exiting: [],
    live,
    orderKeys: live.slice(0, MAX_VISIBLE).map(sprintPresenceViewerReactKey),
    signature: liveSignature,
  });

  if (state.signature !== liveSignature) {
    setState({
      ...nextSprintCardPresenceAvatarState({
        live,
        previousExiting: state.exiting,
        previousLive: state.live,
        previousOrderKeys: state.orderKeys,
        reducedMotion:
          typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        visibleCap: MAX_VISIBLE,
      }),
      signature: liveSignature,
    });
  }

  const onExitAnimationEnd = useCallback((key: string) => {
    setState((current) => ({
      ...current,
      exiting: current.exiting.filter((viewer) => sprintPresenceViewerReactKey(viewer) !== key),
      orderKeys: current.orderKeys.filter((orderKey) => orderKey !== key),
    }));
  }, []);

  return { exiting: state.exiting, onExitAnimationEnd, orderKeys: state.orderKeys };
}

export function SprintCardPresenceAvatars({ taskId }: { taskId: string }) {
  const { t } = useI18n();
  const viewers = useSprintCardPresenceViewers(taskId);
  const { exiting, onExitAnimationEnd, orderKeys } = useExitingSprintCardPresenceViewers(viewers);
  const liveShown = viewers.slice(0, MAX_VISIBLE);
  const slots = mergeSprintCardPresenceAvatarSlots({
    exiting,
    liveShown,
    orderKeys,
  });
  if (slots.length === 0) {
    return null;
  }
  const anonymousLabel = t('sprintPlanner.presence.anonymous');
  const extra = viewers.length - liveShown.length;
  const names = slots.map(({ viewer }) => sprintPresenceDisplayName(viewer, anonymousLabel));

  return (
    <div
      aria-label={t('sprintPlanner.presence.cardAriaLabel', { names: names.join(', ') })}
      className="pointer-events-none absolute right-1 top-1 flex items-center pl-1.5"
      role="group"
      style={{ zIndex: ZIndex.contentInteractive }}
    >
      {slots.map(({ exiting: isExiting, viewer }) => {
        const key = sprintPresenceViewerReactKey(viewer);
        const name = sprintPresenceDisplayName(viewer, anonymousLabel);
        const avatar = (
          <Avatar
            avatarUrl={viewer.avatarUrl}
            className={AVATAR_RING_CLASS}
            initials={getInitials(name)}
            size="sm"
          />
        );
        return (
          <span
            key={key}
            className={
              isExiting
                ? 'sprint-card-presence-avatar-exit inline-flex rounded-full'
                : `${AVATAR_SLOT_CLASS} pointer-events-auto`
            }
            onAnimationEnd={(event) =>
              handlePresenceExitAnimationEnd(event, isExiting, key, onExitAnimationEnd)
            }
          >
            {isExiting ? (
              avatar
            ) : (
              <TextTooltip content={cardPresenceTooltip(viewer, name, t)} delayDuration={80} side="top">
                <span className="inline-flex">{avatar}</span>
              </TextTooltip>
            )}
          </span>
        );
      })}
      {extra > 0 ? (
        <span
          className={`${AVATAR_SLOT_CLASS} ${AVATAR_RING_CLASS} h-6 min-h-6 min-w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 dark:bg-gray-600 dark:text-gray-200`}
        >
          {t('sprintPlanner.presence.overflow', { count: extra })}
        </span>
      ) : null}
    </div>
  );
}
