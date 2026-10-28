'use client';

import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import type { AnimationEvent, ReactNode } from 'react';

import { Button } from '@/components/Button';
import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ToggleTrack } from '@/components/ToggleTrack';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_SEPARATOR,
  FLOATING_MENU_SHELL,
} from '@/features/context-menu/contextMenuClasses';

import {
  placementToolbarLayerIconName,
  placementToolbarLayerLabelMessageKey,
  resolveVisibilityLayerMenuRows,
  resolveVisibilityLayerVisible,
  type SwimlaneVisibilityLayer,
  type SwimlaneVisibilityLayerState,
} from '../utils/swimlanePlacementToolbar';

import { SwimlanePlacementToolbarLayersLayoutMode } from './SwimlanePlacementToolbarLayersLayoutMode';

interface SwimlanePlacementToolbarLayersMenuProps {
  animationState: 'closed' | 'open';
  autoArrange: boolean;
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  factVisible: boolean;
  imagesVisible: boolean;
  linksVisible: boolean;
  notesVisible: boolean;
  personBoundLayersAvailable?: boolean;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  onAutoArrangeChange: (autoArrange: boolean) => void;
  onBaselineLayoutModeChange: (mode: SwimlaneBaselineLayoutMode) => void;
  onOpenTaskCards: () => void;
  onToggleLayer: (layer: SwimlaneVisibilityLayer) => void;
}

function layerGlyph(layer: SwimlaneVisibilityLayer): ReactNode {
  if (layer === 'notes') {
    return <StickyNoteToolIcon className="h-4 w-4 shrink-0" variant="outline" />;
  }
  if (layer === 'links') {
    return <CardLinkIcon />;
  }
  return <Icon className="h-4 w-4 shrink-0" name={placementToolbarLayerIconName(layer)} />;
}

export function SwimlanePlacementToolbarLayersMenu({
  animationState,
  autoArrange,
  baselineLayoutMode,
  factVisible,
  imagesVisible,
  linksVisible,
  notesVisible,
  personBoundLayersAvailable = true,
  onAnimationEnd,
  onAutoArrangeChange,
  onBaselineLayoutModeChange,
  onOpenTaskCards,
  onToggleLayer,
}: SwimlanePlacementToolbarLayersMenuProps) {
  const { t } = useI18n();
  const rows = resolveVisibilityLayerMenuRows({ personBoundLayersAvailable });
  const visibility: SwimlaneVisibilityLayerState = {
    factVisible,
    imagesVisible,
    linksVisible,
    notesVisible,
  };
  return (
    <div
      aria-label={t('sprintPlanner.swimlane.placementToolbar.layers')}
      className={`absolute bottom-full right-0 mb-2 min-w-[15rem] py-1 ${FLOATING_MENU_SHELL} ${OVERLAY_PANEL_ENTER}`}
      data-state={animationState}
      role="menu"
      onAnimationEnd={onAnimationEnd}
    >
      <SwimlanePlacementToolbarLayersLayoutMode
        mode={baselineLayoutMode}
        onChange={onBaselineLayoutModeChange}
      />
      <Button
        aria-checked={autoArrange}
        className={`!h-9 !min-h-0 w-full !justify-start !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700`}
        role="menuitemcheckbox"
        title={t('sprintPlanner.swimlane.placementToolbar.autoArrangeHint')}
        type="button"
        variant="ghost"
        onClick={() => onAutoArrangeChange(!autoArrange)}
      >
        <Icon aria-hidden className="h-4 w-4 shrink-0" name="list-ordered" />
        <span className="min-w-0 flex-1 truncate text-left">
          {t('sprintPlanner.swimlane.placementToolbar.autoArrange')}
        </span>
        <ToggleTrack checked={autoArrange} />
      </Button>
      <Button
        className={`!h-9 !min-h-0 w-full !justify-between !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700`}
        role="menuitem"
        type="button"
        variant="ghost"
        onClick={onOpenTaskCards}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {t('sprintPlanner.swimlane.placementToolbar.tasks')}
        </span>
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-gray-400" name="chevron-right" />
      </Button>
      <div className={CONTEXT_MENU_SEPARATOR} role="separator" />
      {rows.map((row, index) => {
        if (row.kind === 'separator') {
          return <div key={`separator-${index}`} className={CONTEXT_MENU_SEPARATOR} role="separator" />;
        }
        const visible = resolveVisibilityLayerVisible(row.layer, visibility);
        const label = t(
          `sprintPlanner.swimlane.placementToolbar.${placementToolbarLayerLabelMessageKey(row.layer)}`
        );
        return (
          <Button
            key={row.layer}
            aria-checked={visible}
            className={`!h-9 !min-h-0 w-full !justify-start !gap-2 !rounded-none !px-3 !py-0 text-sm font-medium ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
              visible
                ? 'text-gray-700 hover:!bg-gray-50 dark:text-gray-200 dark:hover:!bg-gray-700'
                : 'text-gray-400 hover:!bg-gray-50 dark:text-gray-500 dark:hover:!bg-gray-700'
            }`}
            role="menuitemcheckbox"
            type="button"
            variant="ghost"
            onClick={() => onToggleLayer(row.layer)}
          >
            {layerGlyph(row.layer)}
            <span className="flex-1 text-left">{label}</span>
            <Icon className="h-4 w-4 shrink-0" name={visible ? 'eye' : 'eye-off'} />
          </Button>
        );
      })}
    </div>
  );
}
