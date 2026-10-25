import type { TrackerSyncFailure } from '@/lib/sprints/taskPositionsTrackerSync';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { TRACKER_SYNC_FAILED_EVENT } from '@/lib/api/trackerSyncFailures';

const MAX_KEYS_IN_TOAST = 5;

function formatIssueKeys(keys: readonly string[]): string {
  const unique = [...new Set(keys)];
  const shown = unique.slice(0, MAX_KEYS_IN_TOAST).join(', ');
  const rest = unique.length - MAX_KEYS_IN_TOAST;
  return rest > 0 ? `${shown} +${rest}` : shown;
}

/** Тост, когда позиция сохранилась в планере, но исполнитель или даты не дошли до трекера. */
export function useTrackerSyncFailureToasts(): void {
  const { t } = useI18n();

  useEffect(() => {
    const handler = (event: Event) => {
      const failures = (event as CustomEvent<TrackerSyncFailure[]>).detail ?? [];
      const assignee = failures.filter((f) => f.field === 'assignee').map((f) => f.issueKey);
      const dates = failures.filter((f) => f.field === 'dates').map((f) => f.issueKey);
      if (assignee.length > 0) {
        toast.error(t('sprint.taskToast.trackerSyncAssigneeFailed', { keys: formatIssueKeys(assignee) }), {
          id: 'tracker-sync-assignee',
        });
      }
      if (dates.length > 0) {
        toast.error(t('sprint.taskToast.trackerSyncDatesFailed', { keys: formatIssueKeys(dates) }), {
          id: 'tracker-sync-dates',
        });
      }
    };
    window.addEventListener(TRACKER_SYNC_FAILED_EVENT, handler);
    return () => {
      window.removeEventListener(TRACKER_SYNC_FAILED_EVENT, handler);
    };
  }, [t]);
}
