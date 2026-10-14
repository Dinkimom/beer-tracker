'use client';

import type { SwimlaneCardPlacementTool } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import type { SwimlanePlacementTool } from '@/lib/layers';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { IconActionMotion } from '@/components/IconActionMotion';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_TOOLBAR_ITEM_IDLE,
  FLOATING_TOOLBAR_ITEM_ON,
} from '@/features/context-menu/contextMenuClasses';

import {
  isSwimlaneCardPlacementTool,
  resolveArmedCardPlacementTool,
} from '../utils/swimlanePlacementToolbar';

import {
  formatPlannerShortcutAria,
  PlannerShortcutTooltip,
} from './PlannerShortcutTooltip';
import {
  cardPlacementGlyph,
  SwimlanePlacementToolbarCardTypes,
} from './SwimlanePlacementToolbarCardTypes';
import { formatPlacementToolShortcutHint } from './swimlanePlacementToolbarKeyboard';

interface SwimlanePlacementToolbarCardsToolProps {
  activeTool: SwimlanePlacementTool;
  objectStorageConfigured: boolean;
  onArm: (tool: SwimlaneCardPlacementTool) => void;
  onDeactivate: () => void;
}

export function SwimlanePlacementToolbarCardsTool({
  activeTool,
  objectStorageConfigured,
  onArm,
  onDeactivate,
}: SwimlanePlacementToolbarCardsToolProps) {
  const { t } = useI18n();
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
  const label = t('sprintPlanner.swimlane.placementToolbar.cards');
  const shortcut = formatPlacementToolShortcutHint(armed);

  return (
    <div className="relative">
      <PlannerShortcutTooltip label={label} shortcut={shortcut} side="top">
        <Button
          aria-expanded={cardActive}
          aria-label={formatPlannerShortcutAria(label, shortcut)}
          aria-pressed={cardActive}
          className={`!h-9 !min-h-0 !min-w-0 !gap-2 !rounded-lg !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
            cardActive ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE
          }`}
          type="button"
          variant="ghost"
          onClick={() => {
            if (cardActive) {
              onDeactivate();
              return;
            }
            onArm(resolveArmedCardPlacementTool(remembered, objectStorageConfigured));
          }}
        >
          <IconActionMotion active={cardActive} name="cards">
            {cardPlacementGlyph(armed)}
          </IconActionMotion>
          <span>{label}</span>
        </Button>
      </PlannerShortcutTooltip>
      {cardActive ? (
        <SwimlanePlacementToolbarCardTypes
          objectStorageConfigured={objectStorageConfigured}
          value={armed}
          onChange={onArm}
        />
      ) : null}
    </div>
  );
}
