'use client';

import { useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { IconActionMotion } from '@/components/IconActionMotion';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import { LayerVisibilityMenuItem } from '@/features/context-menu/components/LayerVisibilityMenuItem';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_ITEM_IDLE,
  FLOATING_TOOLBAR_ITEM_ON,
} from '@/features/context-menu/contextMenuClasses';
import { SwimlanePlacementToolbarLayersIcon } from '@/features/sprint/components/SprintPlanner/components/SwimlanePlacementToolbarLayersIcon';
import { OWNED_ESCAPE } from '@/hooks/useEscapeKey';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

interface QuarterlyPlanLayersButtonProps {
  hideDone: boolean;
  notesVisible: boolean;
  onHideDoneChange: (hideDone: boolean) => void;
  onNotesVisibleChange: (visible: boolean) => void;
}

/**
 * Кнопка «Слои» в тулбаре квартала — как на доске спринта: меню того, что показывать на доске.
 * Готовые эпики (QB7) и листы заметок (QN7) — каждый слой можно спрятать.
 */
export function QuarterlyPlanLayersButton({
  hideDone,
  notesVisible,
  onHideDoneChange,
  onNotesVisibleChange,
}: QuarterlyPlanLayersButtonProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const overlay = useOverlayPresence(open);
  const label = t('quarterlyPlan.layers.title');

  usePopoverDismiss(() => setOpen(false), { enabled: open, escape: OWNED_ESCAPE, refs: [rootRef] });

  return (
    <div ref={rootRef} className="relative">
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className={`!h-8 !w-8 !min-h-0 !min-w-0 !gap-0 !rounded-lg !px-0 !py-0 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
          open ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE
        }`}
        title={label}
        type="button"
        variant="ghost"
        onClick={() => setOpen((value) => !value)}
      >
        <IconActionMotion active={open} name="layers">
          <SwimlanePlacementToolbarLayersIcon />
        </IconActionMotion>
      </Button>
      {overlay.mounted ? (
        <div
          aria-label={label}
          className={`absolute bottom-full right-0 mb-2 min-w-[14rem] py-1 ${FLOATING_MENU_SHELL} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          role="menu"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <LayerVisibilityMenuItem
            glyph={<Icon className="h-4 w-4 shrink-0" name="check-circle" />}
            label={t('quarterlyPlan.layers.done')}
            visible={!hideDone}
            onToggle={() => onHideDoneChange(!hideDone)}
          />
          <LayerVisibilityMenuItem
            glyph={<StickyNoteToolIcon className="h-4 w-4 shrink-0" variant="outline" />}
            label={t('quarterlyPlan.layers.notes')}
            visible={notesVisible}
            onToggle={() => onNotesVisibleChange(!notesVisible)}
          />
        </div>
      ) : null}
    </div>
  );
}
