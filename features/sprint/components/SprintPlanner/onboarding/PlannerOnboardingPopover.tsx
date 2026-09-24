'use client';

import type { ReactNode } from 'react';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/Button';

interface PlannerOnboardingPopoverProps {
  body?: string;
  focusToken: string;
  mark?: string;
  primaryLabel: string;
  progress?: string;
  secondaryLabel?: string;
  title?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function PlannerOnboardingPopover({
  body,
  focusToken,
  mark,
  onPrimary,
  onSecondary,
  primaryLabel,
  progress,
  secondaryLabel,
  title,
}: PlannerOnboardingPopoverProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleClass = mark
    ? 'text-base font-semibold text-gray-900 dark:text-gray-100'
    : 'mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100';

  useEffect(() => {
    primaryRef.current?.focus();
  }, [focusToken]);

  const heading = resolvePopoverHeading(mark, title, titleClass);

  return (
    <div className="w-[320px] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
      {progress ? (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{progress}</p>
      ) : null}
      {heading}
      {body ? <p className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300">{body}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        {secondaryLabel && onSecondary ? (
          <Button type="button" variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
        <Button ref={primaryRef} type="button" variant="primary" onClick={onPrimary}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

function resolvePopoverHeading(
  mark: string | undefined,
  title: string | undefined,
  titleClass: string
): ReactNode {
  if (mark && title) {
    return (
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-2xl leading-none">
          {mark}
        </span>
        <h2 className={titleClass} id="planner-onboarding-title">
          {title}
        </h2>
      </div>
    );
  }
  if (!title) {
    return null;
  }
  return (
    <h2 className={titleClass} id="planner-onboarding-title">
      {title}
    </h2>
  );
}
