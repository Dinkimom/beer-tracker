'use client';

import type { ReactElement } from 'react';

import { TextTooltip } from '@/components/TextTooltip';

/** Не мелькать при быстрых кликах — шорткат виден, только если курсор задержался. */
const PLANNER_SHORTCUT_TOOLTIP_DELAY_MS = 700;

interface PlannerShortcutTooltipProps {
  children: ReactElement;
  label: string;
  shortcut: string;
  side?: 'bottom' | 'top';
}

export function formatPlannerShortcutAria(label: string, shortcut: string): string {
  return `${label} (${shortcut})`;
}

export function PlannerShortcutTooltip({
  children,
  label,
  shortcut,
  side = 'top',
}: PlannerShortcutTooltipProps) {
  return (
    <TextTooltip
      content={
        <span className="inline-flex items-center gap-2">
          <span>{label}</span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide">
            {shortcut}
          </span>
        </span>
      }
      contentClassName="!px-2.5 !py-1.5"
      delayDuration={PLANNER_SHORTCUT_TOOLTIP_DELAY_MS}
      side={side}
    >
      {children}
    </TextTooltip>
  );
}
