'use client';

import type { ReactNode } from 'react';

import { useI18n } from '@/contexts/LanguageContext';

export function TrackerStatusTitleCell({
  display,
  mutedClass,
  statusKey,
  statusTypeKey,
}: {
  display: string;
  mutedClass: string;
  statusKey: string;
  statusTypeKey?: string;
}) {
  const { t } = useI18n();
  const same = display.trim().toLowerCase() === statusKey.trim().toLowerCase();
  const secondary = resolveTrackerStatusSecondary({
    same,
    statusKey,
    statusTypeKey,
    t,
  });

  return (
    <div>
      <div className="font-medium text-gray-900 dark:text-gray-100">
        {same ? statusKey : display}
      </div>
      {secondary ? (
        <div className={`mt-0.5 text-xs ${mutedClass}`}>{secondary}</div>
      ) : null}
    </div>
  );
}

function resolveTrackerStatusSecondary({
  same,
  statusKey,
  statusTypeKey,
  t,
}: {
  same: boolean;
  statusKey: string;
  statusTypeKey?: string;
  t: (key: string) => string;
}): ReactNode | null {
  if (!same) {
    return (
      <>
        <code className="rounded bg-gray-100 px-0.5 dark:bg-gray-800">
          {statusKey}
        </code>
        {statusTypeKey ? renderStatusTypeSnippet(statusTypeKey, t, 'beforeTypedCode') : null}
      </>
    );
  }
  if (statusTypeKey) {
    return renderStatusTypeSnippet(statusTypeKey, t, 'typeBeforeCode');
  }
  return null;
}

function renderStatusTypeSnippet(
  statusTypeKey: string,
  t: (key: string) => string,
  labelKey: 'beforeTypedCode' | 'typeBeforeCode'
): ReactNode {
  return (
    <>
      {t(`admin.plannerIntegration.statusRow.${labelKey}`)}
      <code className="rounded bg-gray-100 px-0.5 dark:bg-gray-800">
        {statusTypeKey}
      </code>
    </>
  );
}
