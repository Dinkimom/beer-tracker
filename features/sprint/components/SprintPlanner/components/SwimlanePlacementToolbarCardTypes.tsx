'use client';

import type { SwimlaneCardPlacementTool } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import { TicTacToeMark } from '@/features/widgets/components/TicTacToeMark';

import {
  placementToolRequiresObjectStorage,
  SWIMLANE_CARD_PLACEMENT_TOOLS,
} from '../utils/swimlanePlacementToolbar';

interface SwimlanePlacementToolbarCardTypesProps {
  objectStorageConfigured: boolean;
  value: SwimlaneCardPlacementTool;
  onChange: (tool: SwimlaneCardPlacementTool) => void;
}

const CARD_TYPE_BUTTON_CLASS =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

/** Та же метка на кнопке тулбара и в ряду типов. */
export function cardPlacementGlyph(tool: SwimlaneCardPlacementTool): ReactNode {
  if (tool === 'diagram') {
    return <ExcalidrawMark className="h-3.5 w-3.5 shrink-0" tone="inherit" />;
  }
  if (tool === 'tictactoe') {
    return <TicTacToeMark className="h-4 w-4 shrink-0" />;
  }
  return <Icon className="h-4 w-4 shrink-0" name="image" />;
}

export function SwimlanePlacementToolbarCardTypes({
  objectStorageConfigured,
  value,
  onChange,
}: SwimlanePlacementToolbarCardTypesProps) {
  const { t } = useI18n();
  const storageHint = t('sprintPlanner.swimlane.placementToolbar.objectStorageRequired');
  return (
    <div
      aria-label={t('sprintPlanner.swimlane.placementToolbar.cardsMenu')}
      className={`absolute bottom-full left-1/2 z-10 mb-2 flex -translate-x-1/2 items-center gap-0.5 px-1.5 py-1.5 ${FLOATING_MENU_SHELL}`}
      role="radiogroup"
    >
      {SWIMLANE_CARD_PLACEMENT_TOOLS.map((tool) => {
        const selected = tool === value;
        const disabled = placementToolRequiresObjectStorage(tool) && !objectStorageConfigured;
        const label = t(`sprintPlanner.swimlane.placementToolbar.${tool}`);
        const button = (
          <button
            aria-checked={selected}
            aria-label={label}
            className={`${CARD_TYPE_BUTTON_CLASS} ${
              disabled
                ? 'pointer-events-none cursor-not-allowed opacity-40'
                : 'cursor-pointer active:scale-[0.98]'
            } ${
              selected
                ? 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500'
                : 'bg-transparent hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/80 dark:active:bg-gray-600'
            }`}
            disabled={disabled}
            role="radio"
            type="button"
            onClick={() => onChange(tool)}
            onMouseDown={(event) => event.preventDefault()}
          >
            {cardPlacementGlyph(tool)}
          </button>
        );
        return (
          <TextTooltip key={tool} content={disabled ? storageHint : label} side="top">
            {disabled ? <span className="inline-flex cursor-not-allowed">{button}</span> : button}
          </TextTooltip>
        );
      })}
    </div>
  );
}
