import type { TaskCardBodyLayerProps } from './components/TaskCardStandardBody';
import type { Task, TaskCardVariant } from '@/types';

import { TaskCardAutoAddToSwimlaneButton } from './components/TaskCardAutoAddToSwimlaneButton';
import { TaskCardSidebarResizedSplit } from './components/TaskCardSidebarResizedSplit';
import { TaskCardStandardBody } from './components/TaskCardStandardBody';
import { shouldRenderTaskCardSidebarSplit } from './taskCardRenderHelpers';

export function renderTaskCardBody(params: TaskCardBodyLayerProps): React.ReactNode {
  const showSidebarSplit = shouldRenderTaskCardSidebarSplit({
    showExtraSplit: params.visual.barMetrics.showExtraSplit,
    variant: params.variant,
  });
  if (!showSidebarSplit) {
    return <TaskCardStandardBody {...params} />;
  }
  const { editing: _editing, isResizing: _isResizing, layoutDuration: _layoutDuration, ...split } = params;
  return <TaskCardSidebarResizedSplit {...split} />;
}

export function renderTaskCardChrome(params: {
  developerIds: readonly string[];
  onAutoAddToSwimlane?: (task: Task) => void;
  task: Task;
  variant: TaskCardVariant;
  estimatedSP: number;
}): React.ReactNode {
  if (params.variant !== 'sidebar' || !params.onAutoAddToSwimlane) {
    return null;
  }
  return (
    <TaskCardAutoAddToSwimlaneButton
      developerIds={params.developerIds}
      estimatedSP={params.estimatedSP}
      task={params.task}
      onAutoAddToSwimlane={params.onAutoAddToSwimlane}
    />
  );
}
