'use client';

import type { TaskCardSlotItemContext } from '@/features/task/components/TaskCard/slots/taskCardSlotItemContext';
import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Task, Developer, TaskCardVariant } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { resolveFeatureDraftParentLabel } from '@/features/swimlane/utils/featureDraftParentLabel';
import { useResolvedSwimlaneCardSlotLayout } from '@/hooks/useLocalStorage';
import {
  formatTaskStoryPointsForDisplay,
  formatTaskTestPointsForDisplay,
} from '@/lib/pointsUtils';

import { useFeatureDraftRowNames } from '../FeatureDraftRowNamesContext';
import { useFeatureLaneShowAssigneeAvatar } from '../FeatureLaneCardUiContext';
import { resolveSwimlaneTaskCardSlots } from '../slots/resolveSwimlaneTaskCardSlots';
import { TaskCardSlotItems } from '../slots/TaskCardSlotItems';
import { resolveTaskCardEstimateVisibility } from '../taskCardEstimateVisibility';
import { useTaskCardEstimateMapping } from '../useTaskCardEstimateMapping';

import {
  resolveTaskCardBodyContext,
} from './taskCardBodyContextHelpers';
import { resolveSwimlaneStoryPointsForDisplay } from './taskCardBodyHelpers';
import {
  resolveTaskCardBodyStackClass,
  resolveTaskCardContentDisplayDuration,
  shouldShowTaskCardSwimlaneAssigneeAvatar,
  TaskCardSidebarAssigneeRow,
} from './taskCardBodyLayoutHelpers';
import { TaskCardContent } from './TaskCardContent';
import { TaskCardDueDateChip } from './TaskCardDueDateChip';

interface TaskCardBodyProps {
  actualDuration?: number;
  assigneeName?: string;
  developers?: Developer[];
  displayDuration?: number;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  isDragging?: boolean;
  isQATask?: boolean;
  isResizing?: boolean;
  phaseCardColorScheme?: PlanningPhaseCardColorScheme;
  task: Task;
  variant?: TaskCardVariant;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onPhotoClick?: () => void;
}

export function TaskCardBody({
  actualDuration,
  task,
  developers = [],
  assigneeName,
  variant = 'swimlane',
  displayDuration,
  inlineTitleEditor,
  isQATask: explicitIsQATask,
  isDragging = false,
  isResizing = false,
  onPhotoClick,
  onCommentUpdate,
  phaseCardColorScheme = 'status',
}: TaskCardBodyProps) {
  const { t } = useI18n();
  const estimateMapping = useTaskCardEstimateMapping();
  const showFeatureLaneAssigneeAvatar = useFeatureLaneShowAssigneeAvatar();
  const featureDraftRowNames = useFeatureDraftRowNames();
  const slotLayout = useResolvedSwimlaneCardSlotLayout();
  const parentLabel = task.parent
    ? resolveFeatureDraftParentLabel(task.parent, featureDraftRowNames)
    : '';
  const bodyContext = resolveTaskCardBodyContext({
    assigneeName,
    developers,
    displayDuration,
    explicitIsQATask,
    t,
    task,
    variant,
  });
  const hasEstimate = resolveTaskCardEstimateVisibility({
    hideTestPoints: bodyContext.hideTestPoints,
    isQATask: bodyContext.isQATask,
    mapping: estimateMapping,
    showEstimatesSetting: true,
    taskId: task.id,
  }).showPrimaryEstimate;
  const hasAssignee = shouldShowTaskCardSwimlaneAssigneeAvatar({
    hasAssignee: Boolean(bodyContext.assigneeDisplayName),
    showAssigneeAvatar: showFeatureLaneAssigneeAvatar,
    task,
    variant,
  });
  const slots = variant === 'swimlane'
    ? resolveSwimlaneTaskCardSlots({
        displayDuration,
        hasAssignee,
        hasEstimate,
        hasKey: true,
        hideParent: showFeatureLaneAssigneeAvatar,
        layout: slotLayout,
        task,
      })
    : null;
  const estimateLabel = bodyContext.isQATask && !bodyContext.hideTestPoints
    ? formatTaskTestPointsForDisplay(task, 'compact')
    : formatTaskStoryPointsForDisplay(
        { storyPoints: resolveSwimlaneStoryPointsForDisplay(task, actualDuration ?? displayDuration) },
        'compact'
      );
  const slotContext: TaskCardSlotItemContext = {
    assignee: bodyContext.assigneeDisplayName
      ? {
          avatarUrl: bodyContext.assigneeDeveloper?.avatarUrl,
          initials: bodyContext.assigneeInitials,
          initialsVariant: bodyContext.assigneeAvatarVariant,
          label: bodyContext.assigneeDisplayName,
        }
      : undefined,
    estimateLabel,
    isDragging,
    parentLabel,
  };
  const showEyebrow = Boolean(slots && slots.eyebrow.length > 0);
  const showFooter = Boolean(slots && (slots.footer.length > 0 || slots.footerEnd.length > 0));
  return (
    <div className={resolveTaskCardBodyStackClass(variant, task.localDraftKind === 'diagram' || task.localDraftKind === 'image' || task.localDraftKind === 'widget')}>
      {showEyebrow && slots ? (
        <TaskCardSlotItems context={slotContext} items={slots.eyebrow} task={task} />
      ) : null}

      <TaskCardContent
        centerTitle={showEyebrow}
        developers={developers}
        displayDuration={resolveTaskCardContentDisplayDuration(variant, displayDuration)}
        fontDuration={actualDuration ?? displayDuration}
        inlineTitleEditor={inlineTitleEditor}
        isDragging={isDragging}
        isResizing={isResizing}
        phaseCardColorScheme={phaseCardColorScheme}
        slotContext={slotContext}
        task={task}
        titleLeadItems={slots?.titleLead}
        variant={variant}
        onCommentUpdate={onCommentUpdate}
        onPhotoClick={onPhotoClick}
      />

      {variant === 'sidebar' ? <TaskCardDueDateChip task={task} /> : null}

      {variant === 'sidebar' && (
        <TaskCardSidebarAssigneeRow
          assigneeAvatarUrl={bodyContext.assigneeDeveloper?.avatarUrl}
          assigneeAvatarVariant={bodyContext.assigneeAvatarVariant}
          assigneeDisplayName={bodyContext.assigneeDisplayName}
          assigneeInitials={bodyContext.assigneeInitials}
          assigneeLabel={bodyContext.assigneeLabel}
          assigneeMargin={bodyContext.assigneeMargin}
          assigneeTextSize={bodyContext.assigneeTextSize}
          sidebarAssigneeContent={bodyContext.sidebarAssigneeContent}
        />
      )}

      {showFooter && slots ? (
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <TaskCardSlotItems context={slotContext} items={slots.footer} task={task} />
          <TaskCardSlotItems alignEnd context={slotContext} items={slots.footerEnd} task={task} />
        </div>
      ) : null}
    </div>
  );
}

