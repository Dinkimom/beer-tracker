import type { IssueTrackerStoredProvider } from './types';

export class UnsupportedIssueTrackerOperationError extends Error {
  override readonly name = 'UnsupportedIssueTrackerOperationError';
  readonly operation: string;
  readonly providerKind: IssueTrackerStoredProvider;
  readonly status = 422;

  constructor(operation: string, providerKind: IssueTrackerStoredProvider = 'jira') {
    super(
      `Issue tracker provider "${providerKind}" does not support "${operation}" yet.`
    );
    this.operation = operation;
    this.providerKind = providerKind;
  }
}
