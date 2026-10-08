'use client';

import type { IssueLinkCreateRelationship } from '@/lib/issueTrackerProvider/issueLinkTypes';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { ISSUE_LINK_CREATE_RELATIONSHIPS } from '@/lib/issueTrackerProvider/issueLinkTypes';

interface TaskInfoSidebarIssueLinksAddFormProps {
  disabled: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: {
    relationship: IssueLinkCreateRelationship;
    targetIssueKey: string;
  }) => Promise<void>;
}

export function TaskInfoSidebarIssueLinksAddForm({
  disabled,
  errorMessage,
  onSubmit,
}: TaskInfoSidebarIssueLinksAddFormProps) {
  const { t } = useI18n();
  const [targetIssueKey, setTargetIssueKey] = useState('');
  const [relationship, setRelationship] =
    useState<IssueLinkCreateRelationship>('relates');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const key = targetIssueKey.trim();
    if (!key) {
      setLocalError(t('sprintPlanner.taskInfo.issueLinks.keyRequired'));
      return;
    }
    setLocalError(null);
    try {
      await onSubmit({ targetIssueKey: key, relationship });
      setTargetIssueKey('');
      setRelationship('relates');
    } catch {
      // Ошибка снаружи через errorMessage / toast родителя.
    }
  };

  const shownError = localError || errorMessage;

  return (
    <form className="mt-3 space-y-2" onSubmit={(event) => void handleSubmit(event)}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          disabled={disabled}
          placeholder={t('sprintPlanner.taskInfo.issueLinks.keyPlaceholder')}
          value={targetIssueKey}
          onChange={(event) => setTargetIssueKey(event.target.value)}
        />
        <select
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          disabled={disabled}
          value={relationship}
          onChange={(event) =>
            setRelationship(event.target.value as IssueLinkCreateRelationship)
          }
        >
          {ISSUE_LINK_CREATE_RELATIONSHIPS.map((value) => (
            <option key={value} value={value}>
              {t(`sprintPlanner.taskInfo.issueLinks.types.${value}`)}
            </option>
          ))}
        </select>
        <Button
          className="shrink-0 !px-3 !py-1.5"
          disabled={disabled}
          type="submit"
          variant="secondary"
        >
          {t('sprintPlanner.taskInfo.issueLinks.add')}
        </Button>
      </div>
      {shownError ? (
        <p className="text-xs text-red-600 dark:text-red-400">{shownError}</p>
      ) : null}
    </form>
  );
}
