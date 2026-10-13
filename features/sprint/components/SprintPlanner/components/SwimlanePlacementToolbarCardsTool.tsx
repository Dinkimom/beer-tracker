'use client';

import type { SwimlaneCardPlacementTool } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import type { SwimlanePlacementTool } from '@/lib/layers';
import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconActionMotion } from '@/components/IconActionMotion';
import { useI18n } from '@/contexts/LanguageContext';
import { ExcalidrawMark } from '@/features/comments/components/ExcalidrawMark';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_ITEM_IDLE,
  FLOATING_TOOLBAR_ITEM_ON,
} from '@/features/context-menu/contextMenuClasses';
import { TicTacToeMark } from '@/features/widgets/components/TicTacToeMark';

import {
  isSwimlaneCardPlacementTool,
  resolveArmedCardPlacementTool,
  resolveCardMenuOpen,
  SWIMLANE_CARD_PLACEMENT_TOOLS,
} from '../utils/swimlanePlacementToolbar';

import {
  formatPlannerShortcutAria,
  PlannerShortcutTooltip,
} from './PlannerShortcutTooltip';
import { formatPlacementToolShortcutHint } from './swimlanePlacementToolbarKeyboard';

interface SwimlanePlacementToolbarCardsToolProps {
  activeTool: SwimlanePlacementTool;
  objectStorageConfigured: boolean;
  onArm: (tool: SwimlaneCardPlacementTool) => void;
}

function cardGlyph(tool: SwimlaneCardPlacementTool): ReactNode {
  if (tool === 'diagram') {
    return <ExcalidrawMark className="h-3.5 w-3.5 shrink-0" tone="inherit" />;
  }
  if (tool === 'tictactoe') {
    return <TicTacToeMark className="h-4 w-4 shrink-0" />;
  }
  return <Icon className="h-4 w-4 shrink-0" name="image" />;
}

export function SwimlanePlacementToolbarCardsTool({
  activeTool,
  objectStorageConfigured,
  onArm,
}: SwimlanePlacementToolbarCardsToolProps) {
  const { t } = useI18n();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [remembered, setRemembered] = useState<SwimlaneCardPlacementTool>('image');
  const [seenTool, setSeenTool] = useState(activeTool);
  if (seenTool !== activeTool) {
    setSeenTool(activeTool);
    if (isSwimlaneCardPlacementTool(activeTool)) {
      setRemembered(activeTool);
    }
  }
  const cardActive = isSwimlaneCardPlacementTool(activeTool);
  const armed = cardActive ? activeTool : remembered;
  const menuOpen = popupOpen && cardActive;
  const label = t('sprintPlanner.swimlane.placementToolbar.cards');
  const shortcut = formatPlacementToolShortcutHint(armed);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (root?.contains(event.target as Node)) {
        return;
      }
      setPopupOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPopupOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menuOpen, root]);

  return (
    <div ref={setRoot} className="relative">
      <PlannerShortcutTooltip label={label} shortcut={shortcut} side="top">
        <Button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={formatPlannerShortcutAria(label, shortcut)}
          aria-pressed={cardActive}
          className={`!h-9 !min-h-0 !min-w-0 !gap-2 !rounded-lg !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
            cardActive ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE
          }`}
          type="button"
          variant="ghost"
          onClick={() => {
            setPopupOpen(resolveCardMenuOpen({ cardWasActive: cardActive, popupWasOpen: popupOpen }));
            if (!cardActive) {
              onArm(resolveArmedCardPlacementTool(remembered, objectStorageConfigured));
            }
          }}
        >
          <IconActionMotion active={cardActive} name="cards">
            {cardGlyph(armed)}
          </IconActionMotion>
          <span>{label}</span>
        </Button>
      </PlannerShortcutTooltip>
      {menuOpen ? (
        <div
          aria-label={t('sprintPlanner.swimlane.placementToolbar.cardsMenu')}
          className={`absolute bottom-full left-1/2 z-10 mb-2 flex min-w-[12rem] -translate-x-1/2 flex-col py-1 ${FLOATING_MENU_SHELL}`}
          role="menu"
        >
          {SWIMLANE_CARD_PLACEMENT_TOOLS.map((tool) => {
            const needsStorage = tool === 'image' || tool === 'diagram';
            const disabled = needsStorage && !objectStorageConfigured;
            const itemLabel = t(`sprintPlanner.swimlane.placementToolbar.${tool}`);
            const selected = activeTool === tool;
            return (
              <Button
                key={tool}
                aria-checked={selected}
                className={`!h-9 !min-h-0 w-full !justify-start !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium disabled:pointer-events-none disabled:opacity-40 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
                  selected
                    ? FLOATING_TOOLBAR_ITEM_ON
                    : 'text-gray-700 hover:!bg-gray-50 active:!bg-gray-100 dark:text-gray-200 dark:hover:!bg-gray-700 dark:active:!bg-gray-600'
                }`}
                disabled={disabled}
                role="menuitemradio"
                title={disabled ? t('sprintPlanner.swimlane.placementToolbar.objectStorageRequired') : undefined}
                type="button"
                variant="ghost"
                onClick={() => {
                  onArm(tool);
                  setPopupOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                {cardGlyph(tool)}
                <span>{itemLabel}</span>
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
