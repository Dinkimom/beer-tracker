'use client';

import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_MENU_SHELL } from '@/features/context-menu/contextMenuClasses';
import {
  useSwimlaneBaselineLayoutModeStorage,
  useSwimlaneCalendarBusyVisibleStorage,
  useSwimlaneFactTimelineVisibleStorage,
  useSwimlaneImagesVisibleStorage,
  useSwimlaneLinksVisibilityStorage,
  useSwimlaneNotesVisibleStorage,
} from '@/hooks/useLocalStorage';
import { useRootStore } from '@/lib/layers';

import {
  SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX,
  isEscapeFromEditableTarget,
  placementToolLayerToReveal,
  resolvePlacementToolAfterLayerChange,
  resolvePlacementToolbarTools,
  shouldExitPlacementToolOnEscape,
  toggleSwimlanePlacementTool,
} from '../utils/swimlanePlacementToolbar';

import { SwimlanePlacementToolbarButton } from './SwimlanePlacementToolbarButton';
import { SwimlanePlacementToolbarLayers } from './SwimlanePlacementToolbarLayers';
import { SwimlanePlacementToolbarNoteTool } from './SwimlanePlacementToolbarNoteTool';

export const SwimlanePlacementToolbar = observer(function SwimlanePlacementToolbar({
  variant = 'people',
}: {
  variant?: 'features' | 'people';
}) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const hidePersonBoundTools = variant === 'features';
  const tools = resolvePlacementToolbarTools({ hidePersonBoundTools });
  const [notesVisible, setNotesVisible] = useSwimlaneNotesVisibleStorage();
  const [imagesVisible, setImagesVisible] = useSwimlaneImagesVisibleStorage();
  const [linksVisible, setLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [factVisible, setFactVisible] = useSwimlaneFactTimelineVisibleStorage();
  const [calendarVisible, setCalendarVisible] = useSwimlaneCalendarBusyVisibleStorage();
  const [baselineLayoutMode, setBaselineLayoutMode] = useSwimlaneBaselineLayoutModeStorage();
  const active = sprintPlannerUi.placementTool;

  const selectTool = (tool: typeof active) => {
    const next = toggleSwimlanePlacementTool(active, tool);
    const layer = placementToolLayerToReveal(next);
    if (layer === 'notes') {
      setNotesVisible(true);
    }
    if (layer === 'images') {
      setImagesVisible(true);
    }
    if (layer === 'links') {
      setLinksVisible(true);
    }
    sprintPlannerUi.setPlacementTool(next);
  };

  useEffect(() => {
    const next = resolvePlacementToolAfterLayerChange(sprintPlannerUi.placementTool, {
      imagesVisible,
      linksVisible,
      notesVisible,
    });
    if (next !== sprintPlannerUi.placementTool) {
      sprintPlannerUi.setPlacementTool(next);
    }
  }, [imagesVisible, linksVisible, notesVisible, sprintPlannerUi]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasBlockingOverlay = Boolean(
        sprintPlannerUi.contextMenu ||
          sprintPlannerUi.diagramEditorTaskId ||
          document.querySelector('[data-confirm-dialog="true"]')
      );
      if (
        !shouldExitPlacementToolOnEscape({
          defaultPrevented: event.defaultPrevented,
          fromEditableTarget: isEscapeFromEditableTarget(event.target),
          hasBlockingOverlay,
          key: event.key,
          placementTool: sprintPlannerUi.placementTool,
        })
      ) {
        return;
      }
      sprintPlannerUi.setPlacementTool('cursor');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sprintPlannerUi]);

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-center ${ZIndex.class('floatingControls')}`}
      style={{ bottom: SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX }}
    >
      <div
        aria-label={t('sprintPlanner.swimlane.placementToolbar.aria')}
        className={`pointer-events-auto flex items-center gap-1 px-1.5 py-1.5 ${FLOATING_MENU_SHELL}`}
        data-swimlane-placement-toolbar=""
        role="toolbar"
      >
        {tools.map((tool) =>
          tool === 'comment' ? (
            <SwimlanePlacementToolbarNoteTool
              key={tool}
              active={active === 'comment'}
              color={sprintPlannerUi.stickyNoteColor}
              onColorChange={sprintPlannerUi.setStickyNoteColor}
              onSelect={() => selectTool('comment')}
            />
          ) : (
            <SwimlanePlacementToolbarButton
              key={tool}
              active={active === tool}
              showSeparatorBefore={tool === 'task' || tool === 'availability'}
              tool={tool}
              onSelect={() => selectTool(tool)}
            />
          )
        )}
        <SwimlanePlacementToolbarLayers
          baselineLayoutMode={baselineLayoutMode}
          calendarVisible={calendarVisible}
          factVisible={factVisible}
          imagesVisible={imagesVisible}
          linksVisible={linksVisible}
          notesVisible={notesVisible}
          personBoundLayersAvailable={!hidePersonBoundTools}
          onBaselineLayoutModeChange={setBaselineLayoutMode}
          onCalendarVisibleChange={setCalendarVisible}
          onFactVisibleChange={setFactVisible}
          onImagesVisibleChange={setImagesVisible}
          onLinksVisibleChange={setLinksVisible}
          onNotesVisibleChange={setNotesVisible}
        />
      </div>
    </div>
  );
});
