import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import toast from 'react-hot-toast';

import { issueTrackerProviderMessageKey } from '@/lib/issueTrackerProvider/issueTrackerUi';

type TranslateFn = (key: string) => string;

export function validateTrackerConnectForm(args: {
  connectOrgId: string | null;
  issueTrackerProviderKind: IssueTrackerProviderKind;
  needNewTokenEntry: boolean;
  t: TranslateFn;
  trackerToken: string;
  trackerTokenEditOpen: boolean;
}): string | null {
  if (!args.connectOrgId) {
    return args.t('admin.common.selectOrganization');
  }
  if (args.needNewTokenEntry && !args.trackerToken.trim()) {
    return args.trackerTokenEditOpen
      ? args.t('admin.tracker.tokenPromptEdit')
      : args.t(
          issueTrackerProviderMessageKey(
            'admin.tracker.tokenPromptFirst',
            args.issueTrackerProviderKind
          )
        );
  }
  return null;
}

export function buildTrackerConnectSuccessMessage(args: {
  data: {
    syncJobEnqueued?: boolean;
    syncJobWarning?: string;
    unchanged?: boolean;
  };
  t: TranslateFn;
  trackerToken: string;
}): string {
  if (args.data.unchanged) {
    return args.t('admin.tracker.noChangesSaved');
  }
  const parts: string[] = [];
  if (args.trackerToken.trim()) {
    parts.push(args.t('admin.tracker.tokenSaved'));
  } else {
    parts.push(args.t('admin.tracker.settingsUpdated'));
  }
  if (args.data.syncJobEnqueued) parts.push(args.t('admin.tracker.primaryImportQueued'));
  if (args.data.syncJobWarning) parts.push(args.data.syncJobWarning);
  return parts.join(' ');
}

export function showTrackerConnectValidationError(message: string): void {
  toast.error(message);
}
