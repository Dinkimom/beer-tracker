'use client';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { StatusTag } from '@/components/StatusTag';
import { useIssueTrackerIssueWebUrl } from '@/contexts/IssueTrackerProviderKindContext';

interface EpicsSidebarEpicRowProps {
  addEpicAria: string;
  addEpicTitle: string;
  epic: {
    id: string;
    name?: string;
    originalStatus?: string;
    status?: string;
    type?: string;
  };
  onAddEpic: (epicKey: string) => void;
}

export function EpicsSidebarEpicRow({
  addEpicAria,
  addEpicTitle,
  epic,
  onAddEpic,
}: EpicsSidebarEpicRowProps) {
  const status = epic.originalStatus ?? epic.status;
  const issueUrl = useIssueTrackerIssueWebUrl(epic.id);

  return (
    <div className="px-2 py-2 pl-3 flex items-start gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/40">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <IssueTypeIcon className="h-4 w-4 shrink-0" type={epic.type ?? 'epic'} />
          <a
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            href={issueUrl}
            rel="noopener noreferrer"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
          >
            {epic.id}
          </a>
          {status ? <StatusTag className="shrink-0 text-[10px]" status={status} /> : null}
        </div>
        <span className="block text-sm text-gray-800 dark:text-gray-200 truncate mt-1">
          {epic.name ?? epic.id}
        </span>
      </div>
      <HeaderIconButton
        aria-label={addEpicAria}
        className="h-8 w-8 shrink-0"
        title={addEpicTitle}
        type="button"
        onClick={() => onAddEpic(epic.id)}
      >
        <Icon className="h-4 w-4" name="plus" />
      </HeaderIconButton>
    </div>
  );
}
