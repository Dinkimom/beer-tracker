/**
 * Компонент списка целей
 */

import type { PlanPatchGoalPreview } from '@/lib/sprints/sprintPlanPatchGoalPreview';
import type { ChecklistItem } from '@/types/tracker';

import { GoalItem } from '@/features/sidebar/components/GoalItem';
import { GoalPlanPatchToolbar } from '@/features/sidebar/components/GoalPlanPatchToolbar';
import { GoalPlanPatchUpdateDiff } from '@/features/sidebar/components/GoalPlanPatchUpdateDiff';
import { usePlanPatchGoalPreviewDecisions } from '@/features/sprint/hooks/usePlanPatchGoalPreviewDecisions';

interface GoalsListProps {
  canEdit: boolean;
  checklistItems: ChecklistItem[];
  deletingItems: Map<string, ChecklistItem>;
  editingId: string | null;
  editingText: string;
  goalType: 'delivery' | 'discovery';
  isAdding: boolean;
  newGoalId: string | null;
  sprintId: number | null;
  updatingItems: Set<string>;
  onCancelEdit: () => void;
  onCheckboxChange: (itemId: string, checked: boolean) => void;
  onDeleteGoal: (itemId: string) => void;
  onSaveEdit: () => void;
  onStartEdit: (item: ChecklistItem) => void;
  onTextChange: (text: string) => void;
}

function shownGoalItem(item: ChecklistItem, preview: PlanPatchGoalPreview | undefined): ChecklistItem {
  if (preview?.action !== 'update') {
    return item;
  }
  return { ...item, checked: preview.done, text: preview.text };
}

function goalChecklistItem(preview: PlanPatchGoalPreview): ChecklistItem {
  return {
    checked: preview.done,
    checklistItemType: 'standard',
    id: preview.goalId,
    text: preview.text,
  };
}

export function GoalsList({
  canEdit,
  checklistItems,
  deletingItems,
  editingId,
  editingText,
  goalType,
  isAdding,
  newGoalId,
  onCancelEdit,
  onCheckboxChange,
  onDeleteGoal,
  onSaveEdit,
  onStartEdit,
  onTextChange,
  sprintId,
  updatingItems,
}: GoalsListProps) {
  const decisions = usePlanPatchGoalPreviewDecisions(sprintId);
  const previews = decisions.previews.filter((preview) => preview.goalType === goalType);
  const previewById = new Map(
    previews.filter((preview) => preview.action !== 'create').map((preview) => [preview.goalId, preview])
  );
  const knownIds = new Set(checklistItems.map((item) => item.id));
  const creates = previews.filter((preview) => preview.action === 'create' && !knownIds.has(preview.goalId));
  const total = checklistItems.length;
  const completed = checklistItems.filter((i) => i.checked).length;
  const displayTotal = total || (newGoalId ? 1 : 0);
  const hasRows = checklistItems.length > 0 || Boolean(newGoalId) || creates.length > 0;

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2 mt-3 mb-3">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-0">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-200"
            style={{ width: displayTotal ? `${(completed / displayTotal) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
          {completed}/{displayTotal}
        </span>
      </div>
      {hasRows ? (
        <div className="space-y-0.5">
          {checklistItems.map((item, index) => {
            const isDeleting = deletingItems.has(item.id);
            const isAnotherGoalEditing = editingId !== null && editingId !== item.id;
            const preview = previewById.get(item.id);
            return (
              <div key={item.id}>
                <GoalItem
                  canEdit={canEdit && !isAnotherGoalEditing && preview == null}
                  dimmed={preview?.action === 'delete' || preview?.action === 'update'}
                  editingText={editingText}
                  index={index + 1}
                  isEditing={editingId === item.id}
                  isUpdating={updatingItems.has(item.id) || isDeleting}
                  item={shownGoalItem(item, preview)}
                  onCancelEdit={onCancelEdit}
                  onCheckboxChange={(checked) => onCheckboxChange(item.id, checked)}
                  onDeleteGoal={() => onDeleteGoal(item.id)}
                  onSaveEdit={onSaveEdit}
                  onStartEdit={() => onStartEdit(item)}
                  onTextChange={onTextChange}
                />
                {preview?.action === 'update' ? (
                  <GoalPlanPatchUpdateDiff fromText={item.text} />
                ) : null}
                {preview ? (
                  <GoalPlanPatchToolbar
                    preview={preview}
                    onApprove={(goalId) => {
                      decisions.approve(goalId).catch(() => undefined);
                    }}
                    onReject={(goalId) => {
                      decisions.reject(goalId).catch(() => undefined);
                    }}
                  />
                ) : null}
              </div>
            );
          })}
          {Array.from(deletingItems.entries())
            .filter(([id]) => !checklistItems.some(item => item.id === id))
            .map(([id, item]) => (
              <GoalItem
                key={id}
                canEdit={canEdit}
                editingText=""
                index={0}
                isEditing={false}
                isUpdating={true}
                item={item}
                onCancelEdit={() => {}}
                onCheckboxChange={() => {}}
                onDeleteGoal={() => {}}
                onSaveEdit={() => {}}
                onStartEdit={() => {}}
                onTextChange={() => {}}
              />
            ))}
          {creates.map((preview, index) => (
            <div key={preview.goalId}>
              <GoalItem
                canEdit={false}
                dimmed
                editingText=""
                index={checklistItems.length + index + 1}
                isEditing={false}
                isUpdating={false}
                item={goalChecklistItem(preview)}
                onCancelEdit={() => {}}
                onCheckboxChange={() => {}}
                onDeleteGoal={() => {}}
                onSaveEdit={() => {}}
                onStartEdit={() => {}}
                onTextChange={() => {}}
              />
              <GoalPlanPatchToolbar
                preview={preview}
                onApprove={(goalId) => {
                  decisions.approve(goalId).catch(() => undefined);
                }}
                onReject={(goalId) => {
                  decisions.reject(goalId).catch(() => undefined);
                }}
              />
            </div>
          ))}
          {newGoalId && (
            <GoalItem
              key={newGoalId}
              canEdit={canEdit}
              editingText={editingText}
              index={checklistItems.length + creates.length + 1}
              isEditing={editingId === newGoalId}
              isUpdating={isAdding}
              item={{
                id: newGoalId,
                text: '',
                checked: false,
                checklistItemType: 'standard',
              }}
              onCancelEdit={onCancelEdit}
              onCheckboxChange={() => {}}
              onDeleteGoal={() => {}}
              onSaveEdit={onSaveEdit}
              onStartEdit={() => {}}
              onTextChange={onTextChange}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
