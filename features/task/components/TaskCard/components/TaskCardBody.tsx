'use client';

import type { PlanningPhaseCardColorScheme, SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, Developer, TaskCardVariant } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { resolveFeatureDraftParentLabel } from '@/features/swimlane/utils/featureDraftParentLabel';

import { useFeatureDraftRowNames } from '../FeatureDraftRowNamesContext';
import { useFeatureLaneShowAssigneeAvatar } from '../FeatureLaneCardUiContext';

import {
  resolveTaskCardBodyContext,
} from './taskCardBodyContextHelpers';
import {
  shouldShowTaskCardSwimlaneMetaRow,
  TaskCardSwimlaneMetaRow,
} from './taskCardBodyHelpers';
import {
  resolveTaskCardBodyStackClass,
  resolveTaskCardContentDisplayDuration,
  resolveTaskCardSwimlaneAssigneeAvatarPlacement,
  shouldShowTaskCardParentRow,
  TaskCardSidebarAssigneeRow,
} from './taskCardBodyLayoutHelpers';
import { TaskCardContent } from './TaskCardContent';
import { TaskCardFeatureLaneAssigneeChip } from './TaskCardFeatureLaneAssigneeChip';

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
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
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
  swimlaneCardFields,
}: TaskCardBodyProps) {
  const { t } = useI18n();
  const showFeatureLaneAssigneeAvatar = useFeatureLaneShowAssigneeAvatar();
  const featureDraftRowNames = useFeatureDraftRowNames();
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

  const showParentRow =
    Boolean(parentLabel) &&
    shouldShowTaskCardParentRow({
      displayDuration,
      hideParent: showFeatureLaneAssigneeAvatar,
      swimlaneCardFields,
      task,
      variant,
    });
  const assigneeAvatarPlacement = resolveTaskCardSwimlaneAssigneeAvatarPlacement({
    displayDuration,
    hasAssignee: Boolean(bodyContext.assigneeDisplayName),
    showAssigneeAvatar: showFeatureLaneAssigneeAvatar,
    task,
    variant,
  });
  const showMetaRow = shouldShowTaskCardSwimlaneMetaRow({
    isVeryNarrow: bodyContext.isVeryNarrow,
    swimlaneCardFields,
    task,
    variant,
  });
  const showFooterAssignee = assigneeAvatarPlacement === 'footer';
  return (
    <div className={resolveTaskCardBodyStackClass(variant, task.localDraftKind === 'diagram' || task.localDraftKind === 'image')}>
      {showParentRow && (
        <div className="shrink-0 truncate text-[10px] leading-tight text-gray-700 dark:text-gray-200">
          {parentLabel}
        </div>
      )}

      <TaskCardContent
        centerTitle={showParentRow}
        developers={developers}
        displayDuration={resolveTaskCardContentDisplayDuration(variant, displayDuration)}
        fontDuration={actualDuration ?? displayDuration}
        inlineTitleEditor={inlineTitleEditor}
        isDragging={isDragging}
        isResizing={isResizing}
        phaseCardColorScheme={phaseCardColorScheme}
        swimlaneCardFields={swimlaneCardFields}
        task={task}
        variant={variant}
        onCommentUpdate={onCommentUpdate}
        onPhotoClick={onPhotoClick}
      />

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

      {(showFooterAssignee || showMetaRow) && (
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          {showMetaRow ? (
            <TaskCardSwimlaneMetaRow
              assigneeTextSize={bodyContext.assigneeTextSize}
              displayDuration={actualDuration ?? displayDuration}
              hideTestPoints={bodyContext.hideTestPoints}
              isQATask={bodyContext.isQATask}
              swimlaneCardFields={swimlaneCardFields}
              task={task}
            />
          ) : null}
          {showFooterAssignee && bodyContext.assigneeDisplayName ? (
            <TaskCardFeatureLaneAssigneeChip
              assigneeAvatarUrl={bodyContext.assigneeDeveloper?.avatarUrl}
              assigneeAvatarVariant={bodyContext.assigneeAvatarVariant}
              assigneeInitials={bodyContext.assigneeInitials}
              assigneeLabel={bodyContext.assigneeDisplayName}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export { getTaskCardStyles } from './taskCardBodyStyleHelpers';
