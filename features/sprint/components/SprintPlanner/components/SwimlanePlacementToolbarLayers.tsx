'use client';

import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { CONTEXT_MENU_GHOST_BUTTON_RESET } from '@/features/context-menu/contextMenuClasses';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

import { usePlannerOnboardingChrome } from '../onboarding/plannerOnboardingChrome';
import {
  applyVisibilityLayerToggle,
  type SwimlaneVisibilityLayer,
} from '../utils/swimlanePlacementToolbar';

import { SwimlanePlacementToolbarLayersIcon } from './SwimlanePlacementToolbarLayersIcon';
import { SwimlanePlacementToolbarLayersMenu } from './SwimlanePlacementToolbarLayersMenu';

interface SwimlanePlacementToolbarLayersProps {
  baselineLayoutMode: SwimlaneBaselineLayoutMode;
  calendarVisible: boolean;
  factVisible: boolean;
  imagesVisible: boolean;
  linksVisible: boolean;
  notesVisible: boolean;
  personBoundLayersAvailable?: boolean;
  onBaselineLayoutModeChange: (mode: SwimlaneBaselineLayoutMode) => void;
  onCalendarVisibleChange: (visible: boolean) => void;
  onFactVisibleChange: (visible: boolean) => void;
  onImagesVisibleChange: (visible: boolean) => void;
  onLinksVisibleChange: (visible: boolean) => void;
  onNotesVisibleChange: (visible: boolean) => void;
}

export function SwimlanePlacementToolbarLayers({
  baselineLayoutMode,
  calendarVisible,
  factVisible,
  imagesVisible,
  linksVisible,
  notesVisible,
  personBoundLayersAvailable = true,
  onBaselineLayoutModeChange,
  onCalendarVisibleChange,
  onFactVisibleChange,
  onImagesVisibleChange,
  onLinksVisibleChange,
  onNotesVisibleChange,
}: SwimlanePlacementToolbarLayersProps) {
  const { t } = useI18n();
  const { toolsEmphasis } = usePlannerOnboardingChrome();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const overlay = useOverlayPresence(menuOpen);
  const label = t('sprintPlanner.swimlane.placementToolbar.layers');

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (rootRef.current?.contains(target as Node)) {
        return;
      }
      if (target instanceof Element && target.closest('[data-submenu="true"]')) {
        return;
      }
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      // Safari: without preventDefault, Escape exits fullscreen.
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menuOpen]);

  const toggleLayer = (layer: SwimlaneVisibilityLayer) => {
    applyVisibilityLayerToggle(
      layer,
      { calendarVisible, factVisible, imagesVisible, linksVisible, notesVisible },
      {
        setCalendarVisible: onCalendarVisibleChange,
        setFactVisible: onFactVisibleChange,
        setImagesVisible: onImagesVisibleChange,
        setLinksVisible: onLinksVisibleChange,
        setNotesVisible: onNotesVisibleChange,
      }
    );
  };

  return (
    <>
      <div
        aria-hidden
        className="mx-1 h-6 w-px shrink-0 self-center bg-gray-200 dark:bg-gray-600"
      />
      <div ref={rootRef} className="relative">
        <Button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={label}
          className={`!h-9 !w-9 !min-h-0 !min-w-0 !gap-0 !rounded-lg !px-0 !py-0 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${toolsEmphasis ? 'opacity-40' : ''} ${
            menuOpen
              ? '!bg-blue-50 !text-blue-700 hover:!bg-blue-100 dark:!bg-blue-500/20 dark:!text-blue-200 dark:hover:!bg-blue-500/30'
              : 'text-gray-600 hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700'
          }`}
          data-onboarding="layers"
          title={label}
          type="button"
          variant="ghost"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <SwimlanePlacementToolbarLayersIcon />
        </Button>
        {overlay.mounted ? (
          <SwimlanePlacementToolbarLayersMenu
            animationState={overlay.state}
            baselineLayoutMode={baselineLayoutMode}
            calendarVisible={calendarVisible}
            factVisible={factVisible}
            imagesVisible={imagesVisible}
            linksVisible={linksVisible}
            notesVisible={notesVisible}
            personBoundLayersAvailable={personBoundLayersAvailable}
            onAnimationEnd={overlay.onAnimationEnd}
            onBaselineLayoutModeChange={onBaselineLayoutModeChange}
            onToggleLayer={toggleLayer}
          />
        ) : null}
      </div>
    </>
  );
}
