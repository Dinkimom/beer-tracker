import type { IssueTrackerProviderCapabilities } from './issueTrackerUi';
import type { IssueTrackerProviderKind } from './types';
import type { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';

import { UnsupportedIssueTrackerOperationError } from './errors';
import { issueTrackerProviderCapabilities } from './issueTrackerUi';
import { issueTrackerStoredProvider } from './types';

export function rejectUnsupportedIssueTrackerCapability(
  kind: IssueTrackerProviderKind,
  capability: keyof IssueTrackerProviderCapabilities,
  operation: string
): NextResponse | null {
  if (issueTrackerProviderCapabilities(kind)[capability]) {
    return null;
  }
  return handleApiError(
    new UnsupportedIssueTrackerOperationError(operation, issueTrackerStoredProvider(kind)),
    operation
  );
}
