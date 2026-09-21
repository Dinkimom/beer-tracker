'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import {
  QuickAddMenu,
  type QuickAddMenuIssueMode,
} from '@/features/task/components/TaskBar/components/quickAddMenu/QuickAddMenu';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

function featureLaneAddPickerModes(input: {
  canAttachExisting: boolean;
  canCreateNew: boolean;
}): QuickAddMenuIssueMode[] {
  const modes: QuickAddMenuIssueMode[] = ['draft'];
  if (input.canCreateNew) {
    modes.push('new');
  }
  if (input.canAttachExisting) {
    modes.push('existing');
  }
  return modes;
}

export function FeatureLaneAddMenu() {
  const { t } = useI18n();
  const {
    convertBoardId,
    convertIsSubmitting,
    convertQueueOptions,
    onAddFeatureRow,
    onAddFeatureRowFromExisting,
    onAddFeatureRowFromNew,
  } = useFeatureLaneColumnUi();
  const boardId = convertBoardId ?? 0;
  const modes = featureLaneAddPickerModes({
    canAttachExisting: Boolean(onAddFeatureRowFromExisting) && boardId > 0,
    canCreateNew: Boolean(onAddFeatureRowFromNew),
  });

  if (!onAddFeatureRow) {
    return null;
  }

  const addLabel = t('sprintPlanner.featureLanes.addRow');

  return (
    <QuickAddMenu
      addLabel={addLabel}
      boardId={boardId}
      contentAlign="start"
      hintNew={t('sprintPlanner.featureLanes.addNewHint')}
      isSubmitting={convertIsSubmitting}
      modeLabelKeys={{ new: 'sprintPlanner.featureLanes.convertModeNew' }}
      modes={modes}
      parentCandidates
      queueOptions={convertQueueOptions}
      trigger={
        <Button
          aria-haspopup="menu"
          className="h-auto w-full !min-h-0 justify-start gap-1.5 !rounded-none !px-3 py-2.5 text-sm font-normal text-gray-600 hover:!bg-gray-100 data-[state=open]:bg-gray-100 dark:text-gray-400 dark:hover:!bg-gray-800 dark:hover:!text-gray-100 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-100"
          type="button"
          variant="ghost"
        >
          <Icon className="h-4 w-4 shrink-0" name="plus" />
          <span className="min-w-0 truncate">{addLabel}</span>
        </Button>
      }
      onAddDraft={() => {
        onAddFeatureRow(t('sprintPlanner.featureLanes.newFeatureName'));
      }}
      onSelectExisting={async (task) => Boolean(await onAddFeatureRowFromExisting?.(task))}
      onSubmitNew={async (fields) => Boolean(await onAddFeatureRowFromNew?.(fields))}
    />
  );
}
