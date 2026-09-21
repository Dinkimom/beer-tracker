'use client';

import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';

import { useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

import {
  padTimerDigits,
  parseTimerDigitInput,
  sanitizeTimerDigitInput,
  sprintTimerMsFromParts,
  sprintTimerPartsFromMs,
} from './sprintPlannerTimerPresets';

interface SprintPlannerTimerClockFieldsProps {
  ms: number;
  onCommit: (ms: number) => void;
  onEnter: () => void;
}

const FIELD_CLASS =
  'w-9 border-0 bg-transparent p-0 text-center text-2xl font-semibold tabular-nums text-inherit outline-none selection:bg-blue-200/80 focus:rounded-md focus:bg-white/80 focus:ring-2 focus:ring-blue-500/30 dark:selection:bg-blue-500/35 dark:focus:bg-gray-900/70 dark:focus:ring-gray-500/35';

function draftsFromMs(ms: number): { minutes: string; seconds: string } {
  const parts = sprintTimerPartsFromMs(ms);
  return { minutes: padTimerDigits(parts.minutes), seconds: padTimerDigits(parts.seconds) };
}

function durationFromDrafts(minutesDraft: string, secondsDraft: string): number {
  return sprintTimerMsFromParts(
    parseTimerDigitInput(minutesDraft, 99),
    parseTimerDigitInput(secondsDraft, 59)
  );
}

function focusTimerField(field: HTMLInputElement | null): void {
  field?.focus();
  field?.select();
}

function sanitizeSecondsDraft(raw: string): string {
  const digits = sanitizeTimerDigitInput(raw);
  if (digits.length < 2) {
    return digits;
  }
  return padTimerDigits(parseTimerDigitInput(digits, 59));
}

export function SprintPlannerTimerClockFields({
  ms,
  onCommit,
  onEnter,
}: SprintPlannerTimerClockFieldsProps) {
  const { t } = useI18n();
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState('');
  const [secondsDraft, setSecondsDraft] = useState('');
  const fromMs = draftsFromMs(ms);
  const minutesValue = editing ? minutesDraft : fromMs.minutes;
  const secondsValue = editing ? secondsDraft : fromMs.seconds;

  const commitDrafts = (minutes: string, seconds: string) => {
    const nextMs = durationFromDrafts(minutes, seconds);
    onCommit(nextMs);
    const next = draftsFromMs(nextMs);
    setMinutesDraft(next.minutes);
    setSecondsDraft(next.seconds);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget;
    if (next === minutesRef.current || next === secondsRef.current) {
      return;
    }
    setEditing(false);
    commitDrafts(minutesDraft, secondsDraft);
  };

  const handleMinutesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeTimerDigitInput(event.target.value);
    setMinutesDraft(next);
    if (next.length === 2) {
      focusTimerField(secondsRef.current);
    }
  };

  const handleSecondsChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSecondsDraft(sanitizeSecondsDraft(event.target.value));
  };

  const handleMinutesKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDrafts(minutesDraft, secondsDraft);
      onEnter();
      return;
    }
    if (event.key === 'ArrowRight' && event.currentTarget.selectionStart === event.currentTarget.value.length) {
      event.preventDefault();
      focusTimerField(secondsRef.current);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (!editing) {
      const next = draftsFromMs(ms);
      setMinutesDraft(next.minutes);
      setSecondsDraft(next.seconds);
      setEditing(true);
    }
    event.target.select();
  };

  const handleSecondsKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDrafts(minutesDraft, secondsDraft);
      onEnter();
      return;
    }
    if (event.key === 'ArrowLeft' && event.currentTarget.selectionStart === 0) {
      event.preventDefault();
      focusTimerField(minutesRef.current);
      return;
    }
    if (event.key === 'Backspace' && event.currentTarget.value.length === 0) {
      event.preventDefault();
      focusTimerField(minutesRef.current);
    }
  };

  return (
    <div className="flex items-center justify-center gap-0.5">
      <input
        ref={minutesRef}
        aria-label={t('sprintPlanner.timer.minutesField')}
        autoComplete="off"
        className={FIELD_CLASS}
        inputMode="numeric"
        maxLength={2}
        spellCheck={false}
        type="text"
        value={minutesValue}
        onBlur={handleBlur}
        onChange={handleMinutesChange}
        onFocus={handleFocus}
        onKeyDown={handleMinutesKeyDown}
      />
      <span aria-hidden className="px-0.5 text-xl font-semibold text-gray-400 dark:text-gray-500">
        :
      </span>
      <input
        ref={secondsRef}
        aria-label={t('sprintPlanner.timer.secondsField')}
        autoComplete="off"
        className={FIELD_CLASS}
        inputMode="numeric"
        maxLength={2}
        spellCheck={false}
        type="text"
        value={secondsValue}
        onBlur={handleBlur}
        onChange={handleSecondsChange}
        onFocus={handleFocus}
        onKeyDown={handleSecondsKeyDown}
      />
    </div>
  );
}
