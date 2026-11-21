'use client';

import type { Task } from '@/types';
import type { ReactElement } from 'react';

import { TextTooltip } from '@/components/TextTooltip';
import { FLOATING_TOOLTIP_GLASS_SHELL } from '@/features/context-menu/contextMenuClasses';
import { HistoryTaskPassportContent } from '@/features/sidebar/components/tabs/HistoryTaskPassportContent';

const PASSPORT_DELAY_MS = 400;

/** Паспорт задачи при наведении на её ключ в ленте истории. */
export function HistoryTaskPassportTooltip({
  children,
  issueKey,
  knownTask,
}: {
  children: ReactElement;
  issueKey: string;
  /** Задача из спринта, если уже загружена; иначе — запрос по ключу при показе. */
  knownTask: Task | null;
}) {
  return (
    <TextTooltip
      align="start"
      content={<HistoryTaskPassportContent issueKey={issueKey} knownTask={knownTask} />}
      contentClassName={FLOATING_TOOLTIP_GLASS_SHELL}
      delayDuration={PASSPORT_DELAY_MS}
      side="left"
    >
      {children}
    </TextTooltip>
  );
}
