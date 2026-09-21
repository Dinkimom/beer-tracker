export interface GitLabPipelineJobResponse {
  name?: string;
  stage?: string;
  status?: string;
}

interface GitLabApprovalsResponse {
  approvals_left?: number;
  approvals_required?: number;
  approved?: boolean;
  approved_by?: Array<unknown>;
}

export const MIN_REQUIRED_APPROVALS = 2;

const TEST_E2E_BLACKBOX_RE = /tests?\s*:\s*e2e\s*\(blackbox\)/i;
const TEST_SERVER_WHITEBOX_CODECEPTION_RE = /server\s*:\s*whitebox\s*-\s*codeception/i;

function normalizeToken(v: string | undefined): string {
  return (v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function isCodeQualityStage(stage: string | undefined): boolean {
  const normalized = normalizeToken(stage);
  return normalized === 'codequality' || normalized === 'quality';
}

function jobStatusToTriState(status: string | undefined): boolean | null {
  if (status === 'success') return true;
  if (
    status === 'failed' ||
    status === 'canceled' ||
    status === 'manual' ||
    status === 'skipped'
  ) {
    return false;
  }
  return null;
}

function applyJobTriState(
  tri: boolean | null,
  state: { hasPending: boolean }
): 'continue' | 'failed' | 'ok' {
  if (tri === false) {
    return 'failed';
  }
  if (tri === null) {
    state.hasPending = true;
  }
  return 'continue';
}

export function aggregateJobsStatus(jobs: GitLabPipelineJobResponse[]): boolean | null {
  if (jobs.length === 0) return null;
  const state = { hasPending: false };
  for (const job of jobs) {
    const tri = jobStatusToTriState(job.status);
    const result = applyJobTriState(tri, state);
    if (result === 'failed') {
      return false;
    }
  }
  return state.hasPending ? null : true;
}

export function selectTestJobs(jobs: GitLabPipelineJobResponse[]): GitLabPipelineJobResponse[] {
  return jobs.filter((job) => {
    const name = job.name ?? '';
    return TEST_E2E_BLACKBOX_RE.test(name) || TEST_SERVER_WHITEBOX_CODECEPTION_RE.test(name);
  });
}

function parseConfiguredApprovalsRequired(data: GitLabApprovalsResponse): number {
  const configuredRequired =
    typeof data.approvals_required === 'number' && data.approvals_required > 0
      ? data.approvals_required
      : 0;
  return Math.max(MIN_REQUIRED_APPROVALS, configuredRequired);
}

function parseApprovalsDone(
  data: GitLabApprovalsResponse,
  approvalsRequired: number
): number | null {
  if (Array.isArray(data.approved_by)) {
    return data.approved_by.length;
  }
  if (typeof data.approvals_left === 'number') {
    return Math.max(0, approvalsRequired - data.approvals_left);
  }
  if (data.approved === true) {
    return approvalsRequired;
  }
  return null;
}

export function parseMergeRequestApprovals(
  data: GitLabApprovalsResponse
): { approvalsDone: number | null; approvalsRequired: number } {
  const approvalsRequired = parseConfiguredApprovalsRequired(data);
  return {
    approvalsDone: parseApprovalsDone(data, approvalsRequired),
    approvalsRequired,
  };
}
