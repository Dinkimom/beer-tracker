import type { useSprintPlannerViewModel } from './hooks/useSprintPlannerViewModel';

import { useState } from 'react';

import { ZIndex } from '@/constants';
import { StickyNoteReactionsProvider } from '@/features/comments/StickyNoteReactionsProvider';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { DAYS_HEADER_ROW_HEIGHT_PX } from '@/features/sprint/components/DaysHeader';
import { AssigneeVelocityProvider } from '@/features/swimlane/hooks/useAssigneeVelocity';
import { AgentDevTasksProvider } from '@/features/task/components/TaskCard/AgentDevTasksContext';
import { FeatureDraftRowNamesProvider } from '@/features/task/components/TaskCard/FeatureDraftRowNamesContext';
import { SprintCardPresenceProvider } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useHeightCssVar } from '@/hooks/useHeightCssVar';

import { SprintPlannerBoardViews } from './board';
import { ModalsSection } from './components/ModalsSection';
import { SidebarSection } from './components/SidebarSection';
import { SprintPlannerControlsBar } from './components/SprintPlannerControlsBar';
import { SprintPlannerPresenceSync } from './components/SprintPlannerPresenceSync';
import { SwimlanePlacementToolbar } from './components/SwimlanePlacementToolbar';
import { PlannerMobxSessionBridge } from './mobx/PlannerMobxSessionBridge';
import { PlannerOnboardingHost } from './onboarding/PlannerOnboardingHost';
import { PlannerChromeSlotProvider } from './plannerChromeSlot';
import { SprintPlannerAssigneePickerLayer } from './SprintPlannerAssigneePickerLayer';
import { SprintPlannerDndShell } from './SprintPlannerDndShell';
import { SprintPlannerDragStoresProvider } from './SprintPlannerDragStoresProvider';

type SprintPlannerViewProps = ReturnType<typeof useSprintPlannerViewModel>;

/**
 * Раскладка доски. View model отдаёт срезы по потребителю (свимлейны, канбан, сайдбар, панель,
 * окна, перетаскивание) — здесь они раздаются целиком; своё у разметки — только DOM-узлы рамки.
 */
export function SprintPlannerView({
  assigneePicker,
  boardViewers,
  comments,
  controls,
  dnd,
  dragStores,
  featureDraftRowNamesById,
  kanban,
  modals,
  onboarding,
  placementToolbar,
  presence,
  selectedSprintId,
  sidebar,
  sprints,
  swimlanes,
  viewMode,
  onPaintNoteColor,
}: SprintPlannerViewProps) {
  const [boardFrameEl, setBoardFrameEl] = useState<HTMLDivElement | null>(null);
  const [controlsEl, setControlsEl] = useState<HTMLDivElement | null>(null);
  const [daysSlotEl, setDaysSlotEl] = useState<HTMLDivElement | null>(null);
  const daysChrome = placementToolbar != null;

  useHeightCssVar(boardFrameEl, controlsEl, '--planner-controls-h');

  return (
    <AssigneeVelocityProvider selectedSprintId={selectedSprintId} sprints={sprints}>
    <PlannerChromeSlotProvider slot={daysSlotEl}>
    <StickyNoteReactionsProvider comments={comments} sprintId={selectedSprintId} onPaintNoteColor={onPaintNoteColor}>
      <PlannerMobxSessionBridge />
      <SprintPlannerDndShell {...dnd}>
        <SprintPlannerDragStoresProvider {...dragStores}>
        <AgentDevTasksProvider sprintId={selectedSprintId}>
        <SprintCardPresenceProvider viewers={boardViewers}>
        <FeatureDraftRowNamesProvider names={featureDraftRowNamesById}>
        <SprintPlannerPresenceSync {...presence} />
        <PlannerOnboardingHost {...onboarding}>
        <div className="relative flex h-full min-h-0 w-full flex-1 gap-3 overflow-hidden">
          <div
            ref={setBoardFrameEl}
            className="planner-board-frame relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header"
          >
          <div
            className="absolute inset-0 flex min-h-0 flex-col overflow-hidden"
            style={{ zIndex: ZIndex.base }}
          >
              <SprintPlannerBoardViews kanban={kanban} swimlanes={swimlanes} viewMode={viewMode} />
              {placementToolbar ? <SwimlanePlacementToolbar {...placementToolbar} /> : null}
          </div>
          <div
            ref={setControlsEl}
            className={`absolute inset-x-0 top-0 ${FLOATING_TOOLBAR_GLASS}`}
            style={{ zIndex: ZIndex.plannerControls }}
          >
            <SprintPlannerControlsBar {...controls} />
            <div
              ref={setDaysSlotEl}
              style={daysChrome ? { minHeight: DAYS_HEADER_ROW_HEIGHT_PX } : undefined}
            />
          </div>
          </div>

            <SidebarSection {...sidebar} closedHandleHost={boardFrameEl} />
        </div>
        </PlannerOnboardingHost>
        </FeatureDraftRowNamesProvider>
        </SprintCardPresenceProvider>
        </AgentDevTasksProvider>
        </SprintPlannerDragStoresProvider>
      </SprintPlannerDndShell>
      <ModalsSection {...modals} />
      {assigneePicker ? <SprintPlannerAssigneePickerLayer {...assigneePicker} /> : null}
    </StickyNoteReactionsProvider>
    </PlannerChromeSlotProvider>
    </AssigneeVelocityProvider>
  );
}
