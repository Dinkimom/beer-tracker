'use client';

import type { SwimlanePlacementTool } from '@/lib/layers';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { observer } from 'mobx-react-lite';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useObjectStorageConfigured } from '@/contexts/ObjectStorageConfiguredContext';
import { FLOATING_MENU_SHELL, FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { hrefWithSearchParams } from '@/features/sidebar/utils/hrefWithSearchParams';
import { usePlanPatchGoalPreviewDecisions } from '@/features/sprint/hooks/usePlanPatchGoalPreviewDecisions';
import { useAgentAvailable, useAgentBrand } from '@/features/swimlane/hooks/useAgentSessions';
import { usePlanPatchPreviewDecisions } from '@/features/swimlane/hooks/usePlanPatchPreviewDecisions';
import {
  useSwimlaneBaselineLayoutModeStorage,
  useSwimlaneCalendarBusyVisibleStorage,
  useSwimlaneFactTimelineVisibleStorage,
  useSwimlaneImagesVisibleStorage,
  useSwimlaneLinksVisibilityStorage,
  useSwimlaneNotesVisibleStorage,
} from '@/hooks/useLocalStorage';
import { useRootStore } from '@/lib/layers';

import { useAgentIslandChat } from '../hooks/useAgentIslandChat';
import {
  SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX,
  isAgentProposalToolbarVisible,
  isPlacementToolbarToolSelectable,
  placementToolLayerToReveal,
  placementToolRequiresObjectStorage,
  resolvePlacementToolAfterLayerChange,
  resolvePlacementToolbarTools,
  toggleSwimlanePlacementTool,
} from '../utils/swimlanePlacementToolbar';

import { SprintMovePlacementToolbar } from './SprintMovePlacementToolbar';
import { SwimlaneAgentProposalToolbar } from './SwimlaneAgentProposalToolbar';
import { SwimlanePlacementToolbarAgentButton } from './SwimlanePlacementToolbarAgentButton';
import { SwimlanePlacementToolbarButton } from './SwimlanePlacementToolbarButton';
import { SwimlanePlacementToolbarCardsTool } from './SwimlanePlacementToolbarCardsTool';
import { SwimlanePlacementToolbarLayers } from './SwimlanePlacementToolbarLayers';
import { SwimlanePlacementToolbarNoteTool } from './SwimlanePlacementToolbarNoteTool';
import { SwimlanePlanDraftToolbar } from './SwimlanePlanDraftToolbar';
import { useSwimlanePlacementToolbarKeyboard } from './useSwimlanePlacementToolbarKeyboard';

export const SwimlanePlacementToolbar = observer(function SwimlanePlacementToolbar({
  movePlacement,
  onApproveAgentNotes,
  onRejectAgentNotes,
  pendingAgentNotes = { ids: [] },
  sprintId = null,
  variant = 'people',
}: {
  /** Перенос задачи сюда из другого спринта с выбором места. */
  movePlacement?: { onCancel: () => void; onConfirm: () => void; onFocusCard: () => void };
  onApproveAgentNotes?: (commentIds: readonly string[]) => void;
  onRejectAgentNotes?: (commentIds: readonly string[]) => void;
  pendingAgentNotes?: { clientBrand?: McpOAuthClientBrand; ids: readonly string[] };
  sprintId?: number | null;
  variant?: 'features' | 'people';
}) {
  const { t } = useI18n();
  const { sprintMovePlacement, sprintPlannerUi, taskPositions } = useRootStore();
  const positionPreviewCount = taskPositions.planPatchPreviews.size;
  const planPatchDecisions = usePlanPatchPreviewDecisions(sprintId);
  const goalDecisions = usePlanPatchGoalPreviewDecisions(sprintId);
  const agentAvailable = useAgentAvailable(sprintId);
  const agentBrand = useAgentBrand(sprintId);
  const hasPendingAgentDraft = isAgentProposalToolbarVisible({
    goalPreviewCount: goalDecisions.count,
    hasPendingAgentNote: pendingAgentNotes.ids.length > 0,
    positionPreviewCount,
  });
  const agentIsland = useAgentIslandChat(sprintId);
  const objectStorageConfigured = useObjectStorageConfigured();
  const hidePersonBoundTools = variant === 'features';
  const tools = useMemo(
    () => resolvePlacementToolbarTools({ hidePersonBoundTools }),
    [hidePersonBoundTools]
  );
  const selectableTools = useMemo(
    () => tools.filter((tool) => isPlacementToolbarToolSelectable(tool, objectStorageConfigured)),
    [objectStorageConfigured, tools]
  );
  const objectStorageRequiredHint = t(
    'sprintPlanner.swimlane.placementToolbar.objectStorageRequired'
  );
  const [notesVisible, setNotesVisible] = useSwimlaneNotesVisibleStorage();
  const [imagesVisible, setImagesVisible] = useSwimlaneImagesVisibleStorage();
  const [linksVisible, setLinksVisible] = useSwimlaneLinksVisibilityStorage();
  const [factVisible, setFactVisible] = useSwimlaneFactTimelineVisibleStorage();
  const [calendarVisible, setCalendarVisible] = useSwimlaneCalendarBusyVisibleStorage();
  const [baselineLayoutMode, setBaselineLayoutMode] = useSwimlaneBaselineLayoutModeStorage();
  const active = sprintPlannerUi.placementTool;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const revealGoalsSidebar = useCallback(() => {
    if (searchParams.get('sidebarTab') !== 'goals') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sidebarTab', 'goals');
      router.replace(hrefWithSearchParams(pathname, params), { scroll: false });
    }
    sprintPlannerUi.setSidebarOpen(true);
  }, [pathname, router, searchParams, sprintPlannerUi]);

  const applyPlacementTool = useCallback(
    (tool: SwimlanePlacementTool, options?: { toggle?: boolean }) => {
      if (!isPlacementToolbarToolSelectable(tool, objectStorageConfigured)) {
        return;
      }
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
    [
      active,
      objectStorageConfigured,
      setImagesVisible,
      setLinksVisible,
      setNotesVisible,
      sprintPlannerUi,
    ]
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

  useEffect(() => {
    if (isPlacementToolbarToolSelectable(sprintPlannerUi.placementTool, objectStorageConfigured)) {
      return;
    }
    sprintPlannerUi.setPlacementTool('cursor');
  }, [objectStorageConfigured, sprintPlannerUi]);

  useSwimlanePlacementToolbarKeyboard({
    availableTools: selectableTools,
    onSelectTool: applyPlacementTool,
  });

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-center ${ZIndex.class('floatingControls')}`}
      style={{ bottom: SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX }}
    >
      <div className="flex flex-col items-center gap-2">
        {movePlacement && sprintMovePlacement.session ? (
          <SprintMovePlacementToolbar
            onCancel={movePlacement.onCancel}
            onConfirm={movePlacement.onConfirm}
            onFocusCard={movePlacement.onFocusCard}
          />
        ) : (
          <SwimlanePlanDraftToolbar />
        )}
        {onApproveAgentNotes && onRejectAgentNotes ? (
          <SwimlaneAgentProposalToolbar
            goalPreviewCount={goalDecisions.count}
            hasPendingDraft={hasPendingAgentDraft}
            island={agentIsland}
            pendingCommentIds={pendingAgentNotes.ids}
            positionPreviewCount={positionPreviewCount}
            sprintId={sprintId}
            onApproveAll={(commentIds) => {
              onApproveAgentNotes(commentIds);
              planPatchDecisions.approve().catch(() => undefined);
              goalDecisions.approve().catch(() => undefined);
            }}
            onRejectAll={(commentIds) => {
              onRejectAgentNotes(commentIds);
              planPatchDecisions.reject().catch(() => undefined);
              goalDecisions.reject().catch(() => undefined);
            }}
            onRevealGoals={revealGoalsSidebar}
          />
        ) : null}
        <div
          aria-label={t('sprintPlanner.swimlane.placementToolbar.aria')}
          className={`pointer-events-auto flex items-center gap-1 px-1.5 py-1.5 !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
          data-swimlane-placement-toolbar=""
          role="toolbar"
        >
          {tools.map((tool) => {
            if (tool === 'diagram' || tool === 'tictactoe') {
              return null;
            }
            const toolDisabled =
              !objectStorageConfigured && placementToolRequiresObjectStorage(tool);
            const disabledReason = toolDisabled ? objectStorageRequiredHint : undefined;
            if (tool === 'comment') {
              return (
                <SwimlanePlacementToolbarNoteTool
                  key={tool}
                  active={active === 'comment'}
                  color={sprintPlannerUi.stickyNoteColor}
                  onColorChange={sprintPlannerUi.setStickyNoteColor}
                  onSelect={() => applyPlacementTool('comment', { toggle: true })}
                />
              );
            }
            if (tool === 'image') {
              return (
                <SwimlanePlacementToolbarCardsTool
                  key="cards"
                  activeTool={active}
                  objectStorageConfigured={objectStorageConfigured}
                  onArm={(cardTool) => applyPlacementTool(cardTool)}
                  onDeactivate={() => applyPlacementTool('cursor')}
                />
              );
            }
            return (
              <SwimlanePlacementToolbarButton
                key={tool}
                active={active === tool}
                disabled={toolDisabled}
                disabledReason={disabledReason}
                showSeparatorBefore={tool === 'task' || tool === 'availability'}
                tool={tool}
                onSelect={() => applyPlacementTool(tool, { toggle: true })}
              />
            );
          })}
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
          {sprintId != null && agentAvailable ? (
            <SwimlanePlacementToolbarAgentButton
              brand={agentBrand}
              open={agentIsland.chatOpen}
              openComments={agentIsland.sessions.openComments}
              status={agentIsland.sessions.active?.status}
              onClick={agentIsland.toggleChat}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
});
