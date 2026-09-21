import type { IssueTrackerProviderCapabilities } from './issueTrackerUi';
import type { NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { getIssueTrackerProviderKind } from '@/lib/env';

import { UnsupportedIssueTrackerOperationError } from './errors';
import { issueTrackerProviderCapabilities } from './issueTrackerUi';
import { issueTrackerStoredProvider } from './types';

export function rejectUnsupportedIssueTrackerCapability(
  capability: keyof IssueTrackerProviderCapabilities,
  operation: string
): NextResponse | null {
  const kind = getIssueTrackerProviderKind();
  if (issueTrackerProviderCapabilities(kind)[capability]) {
    return null;
  }
  return handleApiError(
    new UnsupportedIssueTrackerOperationError(operation, issueTrackerStoredProvider(kind)),
    operation
  );
}
