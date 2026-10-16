import type { TaskStatus } from '@/utils/statusMapper';

import { mapTrackerStatusTypeKeyToCategory } from '@/lib/trackerIntegration/statusTypeDefaults';
import { mapStatus } from '@/utils/statusMapper';

/**
 * Planning-facing status category for MCP agents.
 * Prefer known status-name map (e.g. readyfordevelopment → not-started) over raw Jira
 * statusCategory (often mis-tagged as indeterminate/inProgress).
 */
export function resolveMcpIssueStatusCategory(input: {
  statusKey?: string | null;
  statusTypeKey?: string | null;
}): TaskStatus {
  const statusKey = input.statusKey?.trim() ?? '';
  if (statusKey) {
    const fromName = mapStatus(statusKey);
    if (fromName) {
      return fromName;
    }
  }
  const typeKey = input.statusTypeKey?.trim() ?? '';
  if (typeKey) {
    const fromType = mapTrackerStatusTypeKeyToCategory(typeKey);
    if (fromType) {
      return fromType;
    }
  }
  return 'todo';
}
