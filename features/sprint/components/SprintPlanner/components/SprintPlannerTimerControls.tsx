'use client';

import type { SprintTimerActor, SprintTimerStatus } from '@/lib/realtime/sprintTimerState';

import { useI18n } from '@/contexts/LanguageContext';

import { SprintPlannerTimerIconButton } from './SprintPlannerTimerIconButton';
import {
  SPRINT_PLANNER_TIMER_ACTION_BUTTON_CLASS,
  SPRINT_PLANNER_TIMER_ADD_MINUTE_BUTTON_CLASS,
} from './sprintPlannerTimerStyles';

interface SprintPlannerTimerControlsProps {
  busy: boolean;
  setupVisible: boolean;
  status: SprintTimerStatus;
  updatedBy: SprintTimerActor | null;
  onDecrease: () => void;
  onIncrease: () => void;
  onPrimary: () => void;
  onStop: () => void;
}

function timerActorHint(
  status: SprintTimerStatus,
  actorName: string | undefined,
  t: (key: string, params?: Record<string, number | string>) => string
): string | null {
  if (!actorName) {
    return null;
  }
  if (status === 'paused') {
    return t('sprintPlanner.timer.pausedBy', { name: actorName });
  }
  if (status === 'running') {
    return t('sprintPlanner.timer.startedBy', { name: actorName });
  }
  return null;
}

function primaryControl(status: SprintTimerStatus): { actionKey: string; icon: string } {
  if (status === 'running') {
    return { actionKey: 'sprintPlanner.timer.pause', icon: 'pause-fill' };
  }
  if (status === 'paused') {
    return { actionKey: 'sprintPlanner.timer.resume', icon: 'play-fill' };
  }
  return { actionKey: 'sprintPlanner.timer.start', icon: 'play-fill' };
}

export function SprintPlannerTimerControls({
  busy,
  onDecrease,
  onIncrease,
  onPrimary,
  onStop,
  setupVisible,
  status,
  updatedBy,
}: SprintPlannerTimerControlsProps) {
  const { t } = useI18n();
  const primary = primaryControl(status);
  const actorHint = timerActorHint(status, updatedBy?.displayName, t);
  const showStop = !setupVisible && (status === 'running' || status === 'paused');

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        {setupVisible ? (
          <div className="flex items-center gap-1.5">
            <SprintPlannerTimerIconButton
              aria-label={t('sprintPlanner.timer.decrease')}
              disabled={busy}
              icon="minus-bold"
              onClick={onDecrease}
            />
            <SprintPlannerTimerIconButton
              aria-label={t('sprintPlanner.timer.increase')}
              disabled={busy}
              icon="plus-bold"
              onClick={onIncrease}
            />
          </div>
        ) : (
          <button
            aria-label={t('sprintPlanner.timer.increase')}
            className={SPRINT_PLANNER_TIMER_ADD_MINUTE_BUTTON_CLASS}
            disabled={busy}
            type="button"
            onClick={onIncrease}
          >
            {t('sprintPlanner.timer.addMinute')}
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {showStop ? (
            <button
              aria-label={t('sprintPlanner.timer.reset')}
              className={`${SPRINT_PLANNER_TIMER_ACTION_BUTTON_CLASS} w-9`}
              disabled={busy}
              type="button"
              onClick={onStop}
            >
              <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-[3px] bg-red-500" />
            </button>
          ) : null}
          <SprintPlannerTimerIconButton
            aria-label={t(primary.actionKey)}
            disabled={busy}
            icon={primary.icon}
            prominent
            onClick={onPrimary}
          />
        </div>
      </div>
      {actorHint ? (
        <p className="text-center text-[11px] leading-tight text-gray-500 dark:text-gray-400">{actorHint}</p>
      ) : null}
    </div>
  );
}
