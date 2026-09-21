'use client';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import {
  stickyNoteReactionChipMotionClass,
  useStickyNoteReactionChipMotions,
} from '@/features/comments/components/stickyNoteReactionChipMotion';
import {
  formatStickyNoteReactionTooltip,
  STICKY_NOTE_REACTION_EMOJI_CLASS,
  type StickyNoteReaction,
} from '@/lib/comments/stickyNoteReaction';

const CHIP_BASE_CLASS =
  'pointer-events-auto relative flex h-6 origin-center cursor-pointer items-center gap-0.5 rounded border px-1.5 text-[11px] font-medium tabular-nums leading-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

const CHIP_MINE_CLASS =
  'border-blue-400 bg-white text-gray-800 dark:border-blue-400 dark:bg-gray-800 dark:text-gray-100';

const CHIP_OTHER_CLASS =
  'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';

const CHIP_READONLY_CLASS =
  'cursor-default border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';

function stickyNoteReactionChipClass(readOnly: boolean, mine: boolean): string {
  if (readOnly) {
    return `${CHIP_BASE_CLASS} ${CHIP_READONLY_CLASS} pointer-events-none`;
  }
  return `${CHIP_BASE_CLASS} ${mine ? CHIP_MINE_CLASS : CHIP_OTHER_CLASS}`;
}

interface StickyNoteReactionChipsProps {
  reactions: readonly StickyNoteReaction[];
  readOnly?: boolean;
  onToggle: (emoji: string) => void;
}

export function StickyNoteReactionChips({
  reactions,
  onToggle,
  readOnly = false,
}: StickyNoteReactionChipsProps) {
  const { t } = useI18n();
  const { motionOf, onChipAnimationEnd } = useStickyNoteReactionChipMotions(reactions);

  return (
    <div className="flex items-center gap-1">
      {reactions.map((reaction) => {
        const tooltip = formatStickyNoteReactionTooltip(reaction, t('comments.reactionYou'));
        const motionClass = stickyNoteReactionChipMotionClass(motionOf(reaction.emoji));
        const chip = (
          <button
            key={reaction.emoji}
            aria-label={t(reaction.mine ? 'comments.removeReactionAria' : 'comments.reactWithAria', {
              emoji: reaction.emoji,
            })}
            aria-pressed={reaction.mine}
            className={`${stickyNoteReactionChipClass(readOnly, reaction.mine)} ${motionClass}`}
            data-sticky-note-reaction-chip={reaction.emoji}
            disabled={readOnly}
            type="button"
            onAnimationEnd={(event) => onChipAnimationEnd(event, reaction.emoji)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (readOnly) {
                return;
              }
              onToggle(reaction.emoji);
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span aria-hidden className={`${STICKY_NOTE_REACTION_EMOJI_CLASS} text-[14px]`}>
              {reaction.emoji}
            </span>
            <span className="leading-none">{reaction.count}</span>
          </button>
        );

        if (tooltip.length === 0) {
          return chip;
        }

        return (
          <TextTooltip
            key={reaction.emoji}
            content={tooltip}
            delayDuration={150}
            side="top"
            sideOffset={6}
          >
            {chip}
          </TextTooltip>
        );
      })}
    </div>
  );
}
