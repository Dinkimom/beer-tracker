'use client';

import { CardLinkIcon } from '@/components/CardLinkIcon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { TASK_BAR_CORNER_BADGE_CLASS } from './TaskBarCornerRail';

interface TaskBarHiddenLinksBadgeProps {
  count: number;
  interactionDisabled: boolean;
}

/**
 * Счётчик связей, скрытых в покое (режим «Важные» / «При наведении»):
 * видно, что у карточки есть связи, без линий через всю доску.
 */
export function TaskBarHiddenLinksBadge({ count, interactionDisabled }: TaskBarHiddenLinksBadgeProps) {
  const { t } = useI18n();
  return (
    <TextTooltip content={t('task.taskBar.hiddenLinksTooltip', { count })}>
      <span
        className={`${TASK_BAR_CORNER_BADGE_CLASS} gap-0.5 border-ds-border-subtle bg-ds-canvas text-ds-text-muted ${
          interactionDisabled ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <CardLinkIcon className="h-2.5 w-2.5 shrink-0" />
        {count}
      </span>
    </TextTooltip>
  );
}
