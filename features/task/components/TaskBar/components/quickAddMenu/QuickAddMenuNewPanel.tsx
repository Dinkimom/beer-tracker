'use client';

import { useId, type RefObject } from 'react';

import { Button } from '@/components/Button';
import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { formatQuickAddQueueLabel } from '@/features/board/quickAddQueueOptions';

import { QuickAddIssueTypeSelect } from '../QuickAddIssueTypeSelect';

import { QuickAddMenuAssigneeField } from './QuickAddMenuAssigneeField';
import { isQuickAddSubmitKey } from './quickAddMenuKeyboard';
import { QuickAddQueueBadge } from './QuickAddQueueBadge';

const TITLE_FIELD_CLASS =
  'flex items-start rounded-md border border-gray-200 bg-white focus-within:border-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:focus-within:border-blue-400';

const TITLE_TEXTAREA_CLASS =
  'min-h-[4.5rem] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-gray-900 outline-none placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-400';

const SELECT_TRIGGER_CLASS = 'min-w-0 flex-1 !h-9 !px-3.5';

interface QuickAddMenuNewPanelProps {
  assigneeId?: string;
  canCreate: boolean;
  isParentSearching: boolean;
  isQueueSearching: boolean;
  isSubmitting: boolean;
  issueType: string;
  issueTypeOptions: CustomSelectOption<string>[];
  menuZIndex: number;
  parentKey: string;
  parentSelectOptions: CustomSelectOption<string>[];
  queueKey: string;
  queueNamesByKey: Map<string, string>;
  queueSelectOptions: CustomSelectOption<string>[];
  selectedQueueName: string;
  showAssigneeSelect?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  title: string;
  onAssigneeChange?: (assigneeId: string) => void;
  onCreate: () => void;
  onIssueTypeChange: (type: string) => void;
  onParentChange: (parentKey: string) => void;
  onParentSearchQueryChange: (query: string) => void;
  onQueueChange: (queueKey: string) => void;
  onQueueSearchQueryChange: (query: string) => void;
  onTitleChange: (value: string) => void;
}

export function QuickAddMenuNewPanel({
  assigneeId,
  canCreate,
  isParentSearching,
  isQueueSearching,
  isSubmitting,
  issueType,
  issueTypeOptions,
  menuZIndex,
  parentKey,
  parentSelectOptions,
  queueKey,
  queueNamesByKey,
  queueSelectOptions,
  selectedQueueName,
  showAssigneeSelect = false,
  textareaRef,
  title,
  onAssigneeChange,
  onCreate,
  onIssueTypeChange,
  onParentChange,
  onParentSearchQueryChange,
  onQueueChange,
  onQueueSearchQueryChange,
  onTitleChange,
}: QuickAddMenuNewPanelProps) {
  const { t } = useI18n();
  const titleInputId = useId();
  const placeholder = t('sprintPlanner.swimlane.quickAddMenu.titlePlaceholder');

  const renderQueueOption = (option: CustomSelectOption<string>, ctx: { isSelected: boolean }) => {
    const name = queueNamesByKey.get(option.value) ?? option.value;
    return (
      <span className="flex min-w-0 items-center gap-2">
        <QuickAddQueueBadge queueKey={option.value} />
        <span className="min-w-0 truncate font-medium">
          {formatQuickAddQueueLabel(option.value, name)}
        </span>
        {ctx.isSelected ? (
          <Icon aria-hidden className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-400" name="check" />
        ) : null}
      </span>
    );
  };

  const selectedParentOption = parentSelectOptions.find((option) => option.value === parentKey);

  return (
    <div className="px-3 py-3">
      <div className={TITLE_FIELD_CLASS}>
        <div className="shrink-0 pt-2 pl-2">
          <QuickAddIssueTypeSelect
            disabled={isSubmitting}
            issueType={issueType}
            menuZIndex={menuZIndex}
            options={issueTypeOptions}
            title={
              issueTypeOptions.find((option) => option.value === issueType)?.label ??
              t('sprintPlanner.swimlane.quickAddMenu.issueTypeTitle')
            }
            onChange={onIssueTypeChange}
          />
        </div>
        <textarea
          ref={textareaRef}
          aria-label={placeholder}
          className={TITLE_TEXTAREA_CLASS}
          disabled={isSubmitting}
          id={titleInputId}
          placeholder={placeholder}
          rows={2}
          spellCheck={false}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (!isQuickAddSubmitKey(e, true)) {
              return;
            }
            e.preventDefault();
            if (canCreate) {
              onCreate();
            }
          }}
        />
      </div>
      {showAssigneeSelect ? (
        <div className="mt-3">
          <QuickAddMenuAssigneeField
            assigneeId={assigneeId}
            className="h-9 w-full min-w-0"
            isSubmitting={isSubmitting}
            menuZIndex={menuZIndex}
            onAssigneeChange={onAssigneeChange}
          />
        </div>
      ) : null}
      <div className="mt-3 flex h-9 min-w-0 items-stretch gap-2">
        <CustomSelect
          className={SELECT_TRIGGER_CLASS}
          disabled={isSubmitting || queueSelectOptions.length === 0}
          isSearchLoading={isQueueSearching}
          menuZIndex={menuZIndex}
          options={queueSelectOptions}
          renderOption={renderQueueOption}
          renderTriggerValue={() => (
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-gray-700 dark:text-gray-200">
              <QuickAddQueueBadge queueKey={queueKey} />
              <span className="truncate">{formatQuickAddQueueLabel(queueKey, selectedQueueName)}</span>
            </span>
          )}
          searchEmptyMessage={t('sprintPlanner.swimlane.quickAddMenu.queueSearchNoResults')}
          searchLoadingMessage={t('sprintPlanner.swimlane.quickAddMenu.queueSearching')}
          searchPlaceholder={t('sprintPlanner.swimlane.quickAddMenu.queueSearchPlaceholder')}
          searchable
          size="compact"
          title={t('sprintPlanner.swimlane.quickAddMenu.queueTitle')}
          value={queueKey}
          onChange={onQueueChange}
          onSearchQueryChange={onQueueSearchQueryChange}
        />
        <CustomSelect
          className={SELECT_TRIGGER_CLASS}
          disabled={isSubmitting}
          isSearchLoading={isParentSearching}
          menuFitContent
          menuMinWidth={220}
          menuZIndex={menuZIndex}
          options={parentSelectOptions}
          renderTriggerValue={() => (
            <span className="flex min-w-0 items-center text-sm text-gray-700 dark:text-gray-200">
              <span className="min-w-0 truncate">
                {selectedParentOption?.label ??
                  t('sprintPlanner.swimlane.quickAddMenu.parentNone')}
              </span>
            </span>
          )}
          searchEmptyMessage={t('sprintPlanner.swimlane.quickAddMenu.parentSearchNoResults')}
          searchLoadingMessage={t('sprintPlanner.swimlane.quickAddMenu.searching')}
          searchPlaceholder={t('sprintPlanner.swimlane.quickAddMenu.parentSearchPlaceholder')}
          searchable
          size="compact"
          title={t('sprintPlanner.swimlane.quickAddMenu.parentTitle')}
          value={parentKey}
          onChange={onParentChange}
          onSearchQueryChange={onParentSearchQueryChange}
        />
        <Button
          className="!h-9 !min-h-0 shrink-0 !px-3.5 !py-0"
          disabled={!canCreate}
          type="button"
          variant={canCreate ? 'primary' : 'outline'}
          onClick={onCreate}
        >
          {t('sprintPlanner.swimlane.quickAddMenu.create')}
        </Button>
      </div>
    </div>
  );
}
