'use client';

import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { FeatureLaneConvertNewFields } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { CustomSelect } from '@/components/CustomSelect';
import { Input } from '@/components/Input';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useBoards } from '@/features/board/hooks/useBoards';
import { formatQuickAddQueueLabel } from '@/features/board/quickAddQueueOptions';
import { QuickAddIssueTypeSelect } from '@/features/task/components/TaskBar/components/QuickAddIssueTypeSelect';
import { useQuickAddMenuBootstrap } from '@/features/task/components/TaskBar/components/quickAddMenu/hooks/useQuickAddMenuBootstrap';
import { fetchQueueIssueTypes } from '@/lib/api/queues';

import { filterFeatureLaneConvertIssueTypes } from './filterFeatureLaneConvertIssueTypes';

const SELECT_MENU_Z_INDEX = ZIndex.popupContent + 20;

interface FeatureLaneConvertNewPanelProps {
  boardId: number | null;
  hint?: string;
  isSubmitting: boolean;
  queueOptions: QuickAddQueueOption[];
  submitLabel?: string;
  title: string;
  onSubmit: (fields: FeatureLaneConvertNewFields) => void;
}

export function FeatureLaneConvertNewPanel({
  boardId,
  hint,
  isSubmitting,
  onSubmit,
  queueOptions,
  submitLabel,
  title,
}: FeatureLaneConvertNewPanelProps) {
  const { t } = useI18n();
  const { getQueueByBoardId } = useBoards();
  const boardQueueKey = getQueueByBoardId(boardId)?.trim() ?? '';
  const [summary, setSummary] = useState(title);
  const [queueOverride, setQueueOverride] = useState<string | null>(null);
  const [issueType, setIssueType] = useState('');
  const [loadedTypes, setLoadedTypes] = useState<{
    options: Array<{ label: string; value: string }>;
    queueKey: string;
  } | null>(null);
  const queueKey = queueOverride ?? boardQueueKey;

  useEffect(() => {
    if (!queueKey) {
      return;
    }
    let cancelled = false;
    fetchQueueIssueTypes(queueKey).then((types) => {
      if (cancelled) {
        return;
      }
      setLoadedTypes({
        options: filterFeatureLaneConvertIssueTypes(
          types.map((row) => ({ label: row.label, value: row.key }))
        ),
        queueKey,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [queueKey]);

  const bootstrap = useQuickAddMenuBootstrap({
    issueType: issueType || 'task',
    queueKey,
    queueOptions,
    onIssueTypeChange: () => undefined,
  });
  const issueTypeOptions =
    loadedTypes?.queueKey === queueKey ? loadedTypes.options : [];
  const resolvedIssueType = issueTypeOptions.some((option) => option.value === issueType)
    ? issueType
    : issueTypeOptions[0]?.value ?? '';
  const typesLoading = Boolean(queueKey) && loadedTypes?.queueKey !== queueKey;
  const queueSelectOptions = useMemo(
    () => queueOptions.map((option) => ({ label: option.key, value: option.key })),
    [queueOptions]
  );
  const canSubmit = Boolean(
    summary.trim() && queueKey && resolvedIssueType && !isSubmitting && !typesLoading
  );

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    onSubmit({
      issueType: resolvedIssueType,
      queueKey,
      summary: summary.trim(),
    });
  };

  return (
    <div className="px-3 pb-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {hint ?? t('sprintPlanner.featureLanes.convertHint')}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <QuickAddIssueTypeSelect
          disabled={isSubmitting || typesLoading || issueTypeOptions.length === 0}
          issueType={resolvedIssueType}
          menuZIndex={SELECT_MENU_Z_INDEX}
          options={issueTypeOptions}
          title={t('sprintPlanner.swimlane.quickAddMenu.issueTypeTitle')}
          onChange={setIssueType}
        />
        <Input
          autoFocus
          className="!px-3 !py-1.5 text-sm"
          disabled={isSubmitting}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
        />
      </div>
      <div className="mt-3 flex h-9 min-w-0 items-stretch gap-2">
        <CustomSelect
          className="min-w-0 flex-1 !h-9 !px-3.5"
          disabled={isSubmitting || queueSelectOptions.length === 0}
          menuZIndex={SELECT_MENU_Z_INDEX}
          options={queueSelectOptions}
          renderOption={(option) =>
            formatQuickAddQueueLabel(
              option.value,
              bootstrap.queueNamesByKey.get(option.value) ?? option.value
            )
          }
          searchable
          size="compact"
          value={queueKey}
          onChange={(value) => setQueueOverride(value)}
        />
        <Button
          className="!h-9 !min-h-0 shrink-0 !px-3.5 !py-0"
          disabled={!canSubmit}
          type="button"
          variant="primary"
          onClick={submit}
        >
          {submitLabel ?? t('sprintPlanner.featureLanes.convertSubmit')}
        </Button>
      </div>
    </div>
  );
}
