'use client';

import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';

interface QuarterlyPlanIssueKeyProps {
  issueKey: string;
}

/** Ключ эпика — ссылка в трекер; без адреса трекера остаётся подписью. */
export function QuarterlyPlanIssueKey({ issueKey }: QuarterlyPlanIssueKeyProps) {
  const href = useIssueTrackerIssueWebUrl(issueKey);
  const className = 'shrink-0 font-mono text-[11px] text-ds-text-muted';
  if (!href) return <span className={className}>{issueKey}</span>;
  return (
    <a
      className={`${className} cursor-pointer rounded-sm transition-colors hover:text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:text-blue-800 dark:hover:text-blue-300`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {issueKey}
    </a>
  );
}
