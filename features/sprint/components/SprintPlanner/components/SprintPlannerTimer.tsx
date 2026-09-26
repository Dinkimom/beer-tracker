'use client';

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { IconActionMotion } from '@/components/IconActionMotion';
import { useI18n } from '@/contexts/LanguageContext';
import { useSprintTimer } from '@/hooks/useSprintTimer';
import { clampSprintTimerDurationMs, formatSprintTimerClock } from '@/lib/realtime/sprintTimerState';

import { playSprintTimerChime } from './playSprintTimerChime';
import { SprintPlannerTimerClockFields } from './SprintPlannerTimerClockFields';
import { SprintPlannerTimerControls } from './SprintPlannerTimerControls';
import {
  dismissSprintPlannerTimerFinished,
  isSprintPlannerTimerFinishedDismissed,
  shouldAutoOpenFinishedSprintPlannerTimer,
  sprintPlannerTimerFinishedStamp,
} from './sprintPlannerTimerFinished';
import { clampSprintTimerSetupMs, SPRINT_TIMER_DEFAULT_MS } from './sprintPlannerTimerPresets';
import {
  isSprintPlannerTimerActiveStatus,
  SPRINT_PLANNER_TIMER_CLOCK_PANEL_CLASS,
  SPRINT_PLANNER_TIMER_POPOVER_CLASS,
  sprintPlannerTimerTriggerClassName,
} from './sprintPlannerTimerStyles';

interface SprintPlannerTimerProps {
  selectedSprintId: number | null;
}

function isTimerSetupStatus(status: ReturnType<typeof useSprintTimer>['status']): boolean {
  return status === 'idle' || status === 'finished';
}

function runTimerAdjust(
  setupVisible: boolean,
  delta: -1 | 1,
  setDurationMs: (updater: (value: number) => number) => void,
  timer: ReturnType<typeof useSprintTimer>
): void {
  if (setupVisible) {
    setDurationMs((value) => clampSprintTimerSetupMs(value + delta * 60_000));
    return;
  }
  if (delta < 0) {
    timer.subtractMinute();
    return;
  }
  timer.addMinute();
}

function commitDisplayedDuration(
  nextMs: number,
  setupVisible: boolean,
  remainingMs: number,
  durationMsRef: { current: number },
  setDurationMs: (value: number) => void,
  timer: ReturnType<typeof useSprintTimer>
): void {
  const clamped = clampSprintTimerSetupMs(nextMs);
  durationMsRef.current = clamped;
  if (setupVisible) {
    setDurationMs(clamped);
    return;
  }
  const extraMs = Math.round(clamped - remainingMs);
  if (extraMs === 0) {
    return;
  }
  timer.adjustBy(extraMs);
}

function runTimerPrimary(
  status: ReturnType<typeof useSprintTimer>['status'],
  durationMs: number,
  timer: ReturnType<typeof useSprintTimer>
): void {
  if (status === 'running') {
    timer.pause();
    return;
  }
  if (status === 'paused') {
    timer.resume();
    return;
  }
  timer.start(durationMs);
}

export function SprintPlannerTimer({ selectedSprintId }: SprintPlannerTimerProps) {
  const { t } = useI18n();
  const timer = useSprintTimer(selectedSprintId);
  const [open, setOpen] = useState(false);
  const [durationMs, setDurationMs] = useState(SPRINT_TIMER_DEFAULT_MS);
  const durationMsRef = useRef(durationMs);
  const [appliedFinishedStamp, setAppliedFinishedStamp] = useState('');
  const finishedStamp = sprintPlannerTimerFinishedStamp(
    timer.status,
    timer.durationMs,
    timer.updatedAt
  );
  const finishedDismissed = isSprintPlannerTimerFinishedDismissed(selectedSprintId, finishedStamp);
  if (finishedStamp !== '' && finishedStamp !== appliedFinishedStamp) {
    setAppliedFinishedStamp(finishedStamp);
    setDurationMs(clampSprintTimerSetupMs(timer.durationMs));
    if (shouldAutoOpenFinishedSprintPlannerTimer(finishedStamp, appliedFinishedStamp, finishedDismissed)) {
      setOpen(true);
    }
  }
  const setupVisible = isTimerSetupStatus(timer.status);
  const timerActive = isSprintPlannerTimerActiveStatus(timer.status);
  const displayMs = setupVisible ? durationMs : timer.remainingMs;
  const chipClock = formatSprintTimerClock(displayMs);
  const title = timerActive
    ? `${t('sprintPlanner.timer.title')} ${chipClock}`
    : t('sprintPlanner.timer.title');

  useEffect(() => {
    durationMsRef.current = durationMs;
  }, [durationMs]);

  useEffect(() => {
    if (finishedStamp === '' || finishedDismissed) {
      return;
    }
    playSprintTimerChime();
  }, [finishedDismissed, finishedStamp]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && timer.status === 'finished') {
      dismissSprintPlannerTimerFinished(selectedSprintId, finishedStamp);
    }
    setOpen(nextOpen);
  };

  const handleStop = () => {
    timer.stop();
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          aria-label={title}
          className={sprintPlannerTimerTriggerClassName(timer.status, open)}
          disabled={!selectedSprintId}
          title={title}
          type="button"
        >
          <IconActionMotion active={open} name="stopwatch">
            <Icon className="h-4 w-4 shrink-0" name="stopwatch" />
          </IconActionMotion>
          {timerActive ? <span>{chipClock}</span> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" className={SPRINT_PLANNER_TIMER_POPOVER_CLASS} sideOffset={6}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
              {t('sprintPlanner.timer.title')}
            </h2>
            <button
              aria-label={t('sprintPlanner.timer.close')}
              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              type="button"
              onClick={() => handleOpenChange(false)}
            >
              <Icon className="h-3.5 w-3.5" name="close" />
            </button>
          </div>
          <div className={SPRINT_PLANNER_TIMER_CLOCK_PANEL_CLASS}>
            <SprintPlannerTimerClockFields
              ms={displayMs}
              onCommit={(nextMs) =>
                commitDisplayedDuration(
                  nextMs,
                  setupVisible,
                  timer.remainingMs,
                  durationMsRef,
                  setDurationMs,
                  timer
                )
              }
              onEnter={() =>
                runTimerPrimary(timer.status, clampSprintTimerDurationMs(durationMsRef.current), timer)
              }
            />
          </div>
          <SprintPlannerTimerControls
            busy={timer.busy || !selectedSprintId}
            setupVisible={setupVisible}
            status={timer.status}
            updatedBy={timer.updatedBy}
            onDecrease={() => runTimerAdjust(setupVisible, -1, setDurationMs, timer)}
            onIncrease={() => runTimerAdjust(setupVisible, 1, setDurationMs, timer)}
            onPrimary={() =>
              runTimerPrimary(timer.status, clampSprintTimerDurationMs(durationMsRef.current), timer)
            }
            onStop={handleStop}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
