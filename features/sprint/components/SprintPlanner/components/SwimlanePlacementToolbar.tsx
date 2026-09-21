'use client';

import type { SwimlanePlacementTool } from '@/lib/layers';

import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';

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
  placementToolLayerToReveal,
  resolvePlacementToolAfterLayerChange,
  resolvePlacementToolbarTools,
  toggleSwimlanePlacementTool,
} from '../utils/swimlanePlacementToolbar';

import { SwimlaneAgentProposalToolbar } from './SwimlaneAgentProposalToolbar';
import { SwimlanePlacementToolbarButton } from './SwimlanePlacementToolbarButton';
import { SwimlanePlacementToolbarLayers } from './SwimlanePlacementToolbarLayers';
import { SwimlanePlacementToolbarNoteTool } from './SwimlanePlacementToolbarNoteTool';
import { useSwimlanePlacementToolbarKeyboard } from './useSwimlanePlacementToolbarKeyboard';

export const SwimlanePlacementToolbar = observer(function SwimlanePlacementToolbar({
  onApproveAgentNotes,
  onRejectAgentNotes,
  pendingAgentNoteIds = [],
  variant = 'people',
}: {
  onApproveAgentNotes?: (commentIds: readonly string[]) => void;
  onRejectAgentNotes?: (commentIds: readonly string[]) => void;
  pendingAgentNoteIds?: readonly string[];
  variant?: 'features' | 'people';
}) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const hidePersonBoundTools = variant === 'features';
  const tools = useMemo(
    () => resolvePlacementToolbarTools({ hidePersonBoundTools }),
    [hidePersonBoundTools]
  );
  const [notesVisible, setNotesVisible] = useSwimlaneNotesVisibleStorage();
  const [imagesVisible, setImagesVisible] = useSwimlaneImagesVisibleStorage();
  const [linksVisible, setLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [factVisible, setFactVisible] = useSwimlaneFactTimelineVisibleStorage();
  const [calendarVisible, setCalendarVisible] = useSwimlaneCalendarBusyVisibleStorage();
  const [baselineLayoutMode, setBaselineLayoutMode] = useSwimlaneBaselineLayoutModeStorage();
  const active = sprintPlannerUi.placementTool;

  const applyPlacementTool = useCallback(
    (tool: SwimlanePlacementTool, options?: { toggle?: boolean }) => {
      const next = options?.toggle ? toggleSwimlanePlacementTool(active, tool) : tool;
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
    },
    [active, setImagesVisible, setLinksVisible, setNotesVisible, sprintPlannerUi]
  );

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

  useSwimlanePlacementToolbarKeyboard({
    availableTools: tools,
    onSelectTool: applyPlacementTool,
  });

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-center ${ZIndex.class('floatingControls')}`}
      style={{ bottom: SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX }}
    >
      <div className="flex flex-col items-center gap-2">
        {onApproveAgentNotes && onRejectAgentNotes ? (
          <SwimlaneAgentProposalToolbar
            pendingCommentIds={pendingAgentNoteIds}
            onApproveAll={onApproveAgentNotes}
            onRejectAll={onRejectAgentNotes}
          />
        ) : null}
        <div
          aria-label={t('sprintPlanner.swimlane.placementToolbar.aria')}
          className={`pointer-events-auto flex items-center gap-1 px-1.5 py-1.5 !rounded-xl ${FLOATING_MENU_SHELL}`}
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
                onSelect={() => applyPlacementTool('comment', { toggle: true })}
              />
            ) : (
              <SwimlanePlacementToolbarButton
                key={tool}
                active={active === tool}
                showSeparatorBefore={tool === 'task' || tool === 'availability'}
                tool={tool}
                onSelect={() => applyPlacementTool(tool, { toggle: true })}
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
    </div>
  );
});
