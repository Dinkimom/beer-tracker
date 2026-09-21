'use client';

import type { StoryWeekEvent } from '../../../types';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { quarterlyStoryEventEmoji, QUARTERLY_STORY_EVENT_EMOJI_CLASS } from '../../../utils/quarterlyStoryEventCatalog';

interface QuarterlyPlannerWeekEventMarkerProps {
  event: StoryWeekEvent;
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Эмодзи-событие в центре недельной ячейки. */
export function QuarterlyPlannerWeekEventMarker({
  event,
  interactive = false,
  onClick,
}: QuarterlyPlannerWeekEventMarkerProps) {
  const { t } = useI18n();
  const label = t(`planning.quarterlyV2.storyEvent.${event.kind}`);

  const emoji = (
    <span
      className={`${QUARTERLY_STORY_EVENT_EMOJI_CLASS} select-none ${
        interactive ? 'transition-transform group-hover/event:scale-110' : ''
      }`}
    >
      {quarterlyStoryEventEmoji(event.kind)}
    </span>
  );

  if (interactive && onClick) {
    return (
      <TextTooltip content={label} delayDuration={200} side="top">
        <button
          aria-label={label}
          className="group/event pointer-events-auto absolute inset-0 z-[2] flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none hover:bg-black/[0.04] dark:hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-inset"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(e);
          }}
        >
          {emoji}
        </button>
      </TextTooltip>
    );
  }

  /** Только отображение — без overlay и Radix-триггера, чтобы не перехватывать drag фаз. */
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
    >
      {emoji}
    </span>
  );
}
