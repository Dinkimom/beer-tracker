'use client';

import type { QuarterlyStoryEventKind, StoryPhasePosition } from '../../../types';
import type { QuarterlyPlannerCellMenuAnchor } from '../../../utils/quarterlyPlannerCellMenuAnchor';
import type { TaskPosition } from '@/types';

import { wrapWithTextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

import { QUARTERLY_STORY_EVENT_EMOJI_CLASS } from '../../../utils/quarterlyStoryEventCatalog';
import {
  canPickStoryEventKind,
  getStoryEventMenuCatalog,
  getStoryEventMenuFollowUpHint,
  storyEventPickDisabledReason,
  storyEventPickDisabledReasonI18nKey,
  type StoryWeekEventPlacementContext,
} from '../../../utils/quarterlyStoryEventPlacement';

import {
  quarterlyStoryEventFollowUpHintText,
} from './quarterlyPlannerAddEventMenuHelpers';
import { QuarterlyPlannerCellPopover } from './QuarterlyPlannerCellPopover';

export interface QuarterlyPlannerAddEventMenuState extends QuarterlyPlannerCellMenuAnchor {
  hasEvent: boolean;
  weekIndex: number;
}

interface QuarterlyPlannerAddEventMenuProps {
  menu: QuarterlyPlannerAddEventMenuState | null;
  placementContext: StoryWeekEventPlacementContext | null;
  weekPositions: Array<{ phase: StoryPhasePosition; weekPos: TaskPosition }>;
  onClose: () => void;
  onPickEvent: (kind: QuarterlyStoryEventKind, weekIndex: number) => void;
  onRemoveEvent: (weekIndex: number) => void;
}

/** Попап выбора типа события в недельной ячейке строки событий. */
export function QuarterlyPlannerAddEventMenu({
  menu,
  onClose,
  onPickEvent,
  onRemoveEvent,
  placementContext,
  weekPositions,
}: QuarterlyPlannerAddEventMenuProps) {
  const { t } = useI18n();

  if (!menu || !placementContext) return null;

  const ctx: StoryWeekEventPlacementContext = {
    ...placementContext,
    weekIndex: menu.weekIndex,
    weekPositions,
  };

  const enabledItemClass =
    'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 transition-all duration-200 hover:bg-gray-100 active:scale-[0.98] active:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600';
  const disabledItemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed';

  const menuCatalog = getStoryEventMenuCatalog(ctx);
  const followUpHint = getStoryEventMenuFollowUpHint(ctx);

  const pickableCount = menuCatalog.filter(({ kind }) => canPickStoryEventKind(kind, ctx)).length;

  const followUpHintText = quarterlyStoryEventFollowUpHintText(followUpHint, t);

  return (
    <QuarterlyPlannerCellPopover
      anchor={menu}
      contentClassName="max-w-sm"
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <div role="menu">
        {followUpHintText ? (
          <p className="border-b border-gray-200 px-3 py-2 text-xs leading-relaxed text-gray-500 dark:border-gray-600 dark:text-gray-400">
            {followUpHintText}
          </p>
        ) : null}
        {pickableCount === 0 && !followUpHintText ? (
          <p className="px-3 py-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {t('planning.quarterlyV2.storyEventMenuEmptyHint')}
          </p>
        ) : null}
        {menuCatalog.map(({ kind, emoji }) => {
          const enabled = canPickStoryEventKind(kind, ctx);
          const disabledReason = storyEventPickDisabledReason(kind, ctx);
          const disabledTitle =
            disabledReason != null
              ? t(storyEventPickDisabledReasonI18nKey(disabledReason))
              : undefined;

          return wrapWithTextTooltip(
            <button
              key={kind}
              className={enabled ? enabledItemClass : disabledItemClass}
              disabled={!enabled}
              role="menuitem"
              type="button"
              onClick={() => {
                if (!enabled) return;
                onPickEvent(kind, menu.weekIndex);
                onClose();
              }}
            >
              <span
                aria-hidden
                className={`mt-0.5 shrink-0 ${QUARTERLY_STORY_EVENT_EMOJI_CLASS} ${enabled ? '' : 'opacity-40'}`}
              >
                {emoji}
              </span>
              <span className="min-w-0 flex-1">{t(`planning.quarterlyV2.storyEvent.${kind}`)}</span>
            </button>,
            disabledTitle,
            { disabled: !enabled, fullWidth: true }
          );
        })}
        {menu.hasEvent ? (
          <>
            <div className="my-1 border-t border-gray-200 dark:border-gray-600" role="separator" />
            <button
              className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-[0.98] active:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/40 dark:active:bg-red-950/70"
              role="menuitem"
              type="button"
              onClick={() => {
                onRemoveEvent(menu.weekIndex);
                onClose();
              }}
            >
              {t('planning.quarterlyV2.removeStoryEvent')}
            </button>
          </>
        ) : null}
      </div>
    </QuarterlyPlannerCellPopover>
  );
}
