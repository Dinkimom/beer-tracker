'use client';

import type { useQuarterlyPlanAgent, useQuarterlyPlanDraftPreview } from '../useQuarterlyPlanAgent';

import { ZIndex } from '@/constants';
import { SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';

import { QuarterlyPlanAgentChat } from './QuarterlyPlanAgentChat';
import { QuarterlyPlanDraftBar } from './QuarterlyPlanDraftBar';

/** Над тулбаром: высота острова тулбара и зазор. */
const ISLAND_BOTTOM_PX = SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX + 52;

interface QuarterlyPlanAgentIslandProps {
  agent: ReturnType<typeof useQuarterlyPlanAgent>;
  chatOpen: boolean;
  draftView: ReturnType<typeof useQuarterlyPlanDraftPreview>;
}

/**
 * Остров агента над тулбаром квартала — как на доске спринта (QM10, QM11): строка ревью черновика,
 * над ней — чат. Нет ни черновика, ни открытого чата — ничего.
 */
export function QuarterlyPlanAgentIsland({ agent, chatOpen, draftView }: QuarterlyPlanAgentIslandProps) {
  const { draft } = agent;
  if (!draft && !chatOpen) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ bottom: ISLAND_BOTTOM_PX, zIndex: ZIndex.floatingControls }}
    >
      <div className="pointer-events-auto relative">
        {chatOpen ? (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
            <QuarterlyPlanAgentChat scope={agent.scope} />
          </div>
        ) : null}
        {draft ? (
          <QuarterlyPlanDraftBar
            busy={agent.busy}
            error={draft.error}
            itemCount={draftView.itemCount}
            showing={draftView.showing}
            onApproveAll={() => agent.approve({ proposalId: draft.proposalId })}
            onRejectAll={() => agent.reject({ proposalId: draft.proposalId })}
            onToggle={draftView.toggle}
          />
        ) : null}
      </div>
    </div>
  );
}
