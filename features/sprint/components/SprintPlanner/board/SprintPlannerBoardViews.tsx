'use client';

import type { FeatureSwimlanesSectionProps } from '../feature-lanes/FeatureSwimlanesSection';
import type { KanbanViewProps } from '../kanban/KanbanView';
import type { BoardViewMode } from '@/hooks/useLocalStorage';

import dynamic from 'next/dynamic';

import { SprintPlannerBoardViewFallback } from './SprintPlannerBoardViewFallback';

type SprintPlannerSwimlanesViewProps = FeatureSwimlanesSectionProps;

function loadBoardViewFallback() {
  return <SprintPlannerBoardViewFallback />;
}

const KanbanView = dynamic(
  () => import('../kanban/KanbanView').then((mod) => mod.KanbanView),
  { loading: loadBoardViewFallback, ssr: false }
);

const SwimlanesSection = dynamic(
  () => import('../components/SwimlanesSection').then((mod) => mod.SwimlanesSection),
  { loading: loadBoardViewFallback, ssr: false }
);

const FeatureSwimlanesSection = dynamic(
  () =>
    import('../feature-lanes/FeatureSwimlanesSection').then((mod) => mod.FeatureSwimlanesSection),
  { loading: loadBoardViewFallback, ssr: false }
);

interface SprintPlannerBoardViewsProps {
  kanban: KanbanViewProps;
  swimlanes: SprintPlannerSwimlanesViewProps;
  viewMode: BoardViewMode;
}

/**
 * Основная область доски: канбан или свимлейны в зависимости от режима.
 */
export function SprintPlannerBoardViews({
  viewMode,
  kanban,
  swimlanes,
}: SprintPlannerBoardViewsProps) {
  if (viewMode === 'kanban') {
    return <KanbanView {...kanban} />;
  }

  if (viewMode === 'features') {
    return <FeatureSwimlanesSection {...swimlanes} />;
  }

  const swimlaneViewMode: 'compact' | 'full' =
    viewMode === 'compact' || viewMode === 'full' ? viewMode : 'full';

  return <SwimlanesSection {...swimlanes} viewMode={swimlaneViewMode} />;
}
