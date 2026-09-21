'use client';

import { Button } from '@/components/Button';

import { invalidTasksRuNoun } from './sprintStartChecklistInvalidTasksRuNoun';

function getCheck3EnDetailMessage(
  invalidTasksCount: number,
  t: (key: string, params?: Record<string, number | string>) => string,
): string {
  if (invalidTasksCount === 1) {
    return t('sidebar.sprintStartChecklist.invalidDetailOne');
  }
  return t('sidebar.sprintStartChecklist.invalidDetailMany', { count: invalidTasksCount });
}

function getCheck3RuIntroMessage(
  invalidTasksCount: number,
  t: (key: string, params?: Record<string, number | string>) => string,
): string {
  if (invalidTasksCount === 1) {
    return t('sidebar.sprintStartChecklist.check3IntroRuFem');
  }
  return t('sidebar.sprintStartChecklist.check3IntroRuNeut');
}

function getCheck3RuCountLabel(invalidTasksCount: number): string {
  if (invalidTasksCount === 1) {
    return '1';
  }
  return String(invalidTasksCount);
}

interface SprintStartChecklistCheck3DetailsProps {
  invalidTasksCount: number;
  language: string;
  setMainTab: (tab: 'invalid') => void;
  t: (key: string, params?: Record<string, number | string>) => string;
}

export function SprintStartChecklistCheck3Details({
  language,
  invalidTasksCount,
  t,
  setMainTab,
}: SprintStartChecklistCheck3DetailsProps) {
  return (
    <>
      {language === 'en' ? (
        <>
          {t('sidebar.sprintStartChecklist.check3IntroEn')}
          <span className="text-red-600 dark:text-red-400 font-medium">
            {getCheck3EnDetailMessage(invalidTasksCount, t)}
          </span>
          .{' '}
        </>
      ) : (
        <>
          {getCheck3RuIntroMessage(invalidTasksCount, t)}
          <span className="text-red-600 dark:text-red-400 font-medium">
            {getCheck3RuCountLabel(invalidTasksCount)} {invalidTasksRuNoun(invalidTasksCount, t)}
          </span>
          .{' '}
        </>
      )}
      <Button
        className="h-auto min-h-0 p-0 text-xs text-blue-600 underline-offset-2 hover:bg-transparent hover:underline dark:text-blue-400"
        type="button"
        variant="ghost"
        onClick={() => setMainTab('invalid')}
      >
        {t('sidebar.sprintStartChecklist.openInvalidTab')}
      </Button>
    </>
  );
}
