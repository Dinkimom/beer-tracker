import { apiCache, cacheKeys } from '@/lib/cache';

import {
  aggregateJobsStatus,
  isCodeQualityStage,
  MIN_REQUIRED_APPROVALS,
  parseMergeRequestApprovals,
  selectTestJobs,
  type GitLabPipelineJobResponse,
} from './mergeRequestChecksHelpers';
import {
  GITLAB_MR_FACT_CACHE_TTL_SECONDS,
  GITLAB_MR_FACT_ERROR_CACHE_TTL_SECONDS,
  type GitLabFactEvent,
  type GitLabMergeRequestChecks,
  type GitLabMergeRequestFact,
  type GitLabMergeRequestFactError,
} from './mergeRequestFactTypes';
import { parseGitLabMergeRequestLink } from './mergeRequestLink';

interface GitLabApprovalsResponse {
  approvals_left?: number;
  approvals_required?: number;
  approved?: boolean;
  approved_by?: Array<{
    approved_at?: string;
    user?: { name?: string; username?: string };
  }>;
}

interface GitLabMergeRequestResponse {
  created_at?: string;
  head_pipeline?: { id?: number; status?: string } | null;
  merged_at?: string | null;
  state?: string;
  target_branch?: string;
  web_url?: string;
}

interface GitLabPipelineResponse {
  created_at?: string;
  id?: number;
  status?: string;
  updated_at?: string;
}

interface GitLabRequestContext {
  apiBase: string;
  headers: Record<string, string>;
  mrPath: string;
  projectId: string;
}

interface GitlabJsonResult<T> {
  data: T | null;
  status: number | null;
}

function emptyChecks(): GitLabMergeRequestChecks {
  return {
    approvalsDone: null,
    approvalsRequired: MIN_REQUIRED_APPROVALS,
    lintSuccess: null,
    testsSuccess: null,
  };
}

function emptyFact(
  link: string,
  error?: GitLabMergeRequestFactError
): GitLabMergeRequestFact {
  return {
    checks: emptyChecks(),
    error,
    events: [],
    link,
    mergedAt: null,
    webUrl: null,
  };
}

function normalizeCacheLink(link: string): string {
  return link.trim();
}

function mapHttpStatusToError(status: number | null): GitLabMergeRequestFactError {
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 404) return 'not_found';
  return 'fetch_failed';
}

async function gitlabJson<T>(
  url: string,
  headers: Record<string, string>
): Promise<GitlabJsonResult<T>> {
  try {
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.warn(`[gitlab] ${resp.status} ${url}`);
      return { data: null, status: resp.status };
    }
    return { data: (await resp.json()) as T, status: resp.status };
  } catch (err) {
    console.warn(`[gitlab] network error ${url}`, err);
    return { data: null, status: null };
  }
}

function buildContext(link: string, token: string): GitLabRequestContext | null {
  const parsed = parseGitLabMergeRequestLink(link);
  if (!parsed) {
    return null;
  }
  const projectId = encodeURIComponent(parsed.projectPath);
  return {
    apiBase: `${parsed.baseUrl}/api/v4`,
    headers: { 'PRIVATE-TOKEN': token },
    mrPath: `/projects/${projectId}/merge_requests/${encodeURIComponent(parsed.iid)}`,
    projectId,
  };
}

async function fetchApprovalsAndEvents(
  context: GitLabRequestContext
): Promise<{
  approvalsDone: number | null;
  approvalsRequired: number;
  approvalEvents: GitLabFactEvent[];
  status: number | null;
}> {
  const { data, status } = await gitlabJson<GitLabApprovalsResponse>(
    `${context.apiBase}${context.mrPath}/approvals`,
    context.headers
  );
  if (!data) {
    return {
      approvalsDone: null,
      approvalsRequired: MIN_REQUIRED_APPROVALS,
      approvalEvents: [],
      status,
    };
  }
  const parsed = parseMergeRequestApprovals(data);
  const approvalEvents: GitLabFactEvent[] = [];
  for (const entry of data.approved_by ?? []) {
    const at = entry.approved_at?.trim();
    if (!at) continue;
    const label = entry.user?.name?.trim() || entry.user?.username?.trim() || undefined;
    approvalEvents.push({ at, kind: 'approved', label });
  }
  return {
    approvalsDone: parsed.approvalsDone,
    approvalsRequired: parsed.approvalsRequired,
    approvalEvents,
    status,
  };
}

function pipelineEventFromRow(pipeline: GitLabPipelineResponse): GitLabFactEvent | null {
  if (typeof pipeline.id !== 'number') {
    return null;
  }
  const status = pipeline.status;
  const at = (pipeline.updated_at ?? pipeline.created_at)?.trim();
  if (!at) {
    return null;
  }
  if (status === 'success') {
    return { at, kind: 'pipeline_success', label: `#${pipeline.id}` };
  }
  if (status === 'failed' || status === 'canceled') {
    return { at, kind: 'pipeline_failed', label: `#${pipeline.id}` };
  }
  return null;
}

async function fetchPipelineEvents(
  context: GitLabRequestContext
): Promise<{ events: GitLabFactEvent[]; headPipelineId: number | null; status: number | null }> {
  const { data: pipelines, status } = await gitlabJson<GitLabPipelineResponse[]>(
    `${context.apiBase}${context.mrPath}/pipelines?per_page=20`,
    context.headers
  );
  if (!pipelines?.length) {
    return { events: [], headPipelineId: null, status };
  }
  const events: GitLabFactEvent[] = [];
  for (const pipeline of pipelines) {
    const event = pipelineEventFromRow(pipeline);
    if (event) {
      events.push(event);
    }
  }
  const headPipelineId = typeof pipelines[0]?.id === 'number' ? pipelines[0].id : null;
  return { events, headPipelineId, status };
}

async function fetchJobChecks(
  context: GitLabRequestContext,
  pipelineId: number | null
): Promise<Pick<GitLabMergeRequestChecks, 'lintSuccess' | 'testsSuccess'>> {
  if (pipelineId == null) {
    return { lintSuccess: null, testsSuccess: null };
  }
  const { data: jobs } = await gitlabJson<GitLabPipelineJobResponse[]>(
    `${context.apiBase}/projects/${context.projectId}/pipelines/${encodeURIComponent(String(pipelineId))}/jobs?per_page=100`,
    context.headers
  );
  if (!jobs) {
    return { lintSuccess: null, testsSuccess: null };
  }
  const lintJobs = jobs.filter((job) => isCodeQualityStage(job.stage));
  const requiredTestJobs = selectTestJobs(jobs);
  return {
    lintSuccess: aggregateJobsStatus(lintJobs),
    testsSuccess: requiredTestJobs.length === 2 ? aggregateJobsStatus(requiredTestJobs) : null,
  };
}

function sortEvents(events: GitLabFactEvent[]): GitLabFactEvent[] {
  return [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

async function fetchUncachedMergeRequestFact(
  link: string,
  token: string
): Promise<GitLabMergeRequestFact> {
  const context = buildContext(link, token);
  if (!context) {
    return emptyFact(link, 'fetch_failed');
  }

  const mrResult = await gitlabJson<GitLabMergeRequestResponse>(
    `${context.apiBase}${context.mrPath}`,
    context.headers
  );

  if (!mrResult.data) {
    return emptyFact(link, mapHttpStatusToError(mrResult.status));
  }

  const mr = mrResult.data;
  const [approvals, pipelineBundle] = await Promise.all([
    fetchApprovalsAndEvents(context),
    fetchPipelineEvents(context),
  ]);

  const headFromMr =
    typeof mr.head_pipeline?.id === 'number' ? mr.head_pipeline.id : null;
  const pipelineId = headFromMr ?? pipelineBundle.headPipelineId;
  const jobChecks = await fetchJobChecks(context, pipelineId);

  const events: GitLabFactEvent[] = [...approvals.approvalEvents, ...pipelineBundle.events];
  const mergedAt = mr.merged_at?.trim() || null;
  if (mergedAt) {
    const targetBranch = mr.target_branch?.trim() || undefined;
    events.push({
      at: mergedAt,
      kind: 'merged',
      ...(targetBranch ? { label: targetBranch } : {}),
    });
  }

  return {
    checks: {
      approvalsDone: approvals.approvalsDone,
      approvalsRequired: approvals.approvalsRequired,
      lintSuccess: jobChecks.lintSuccess,
      testsSuccess: jobChecks.testsSuccess,
    },
    events: sortEvents(events),
    link,
    mergedAt,
    webUrl: mr.web_url?.trim() || link,
  };
}

/**
 * Факт MR (events + checks) с in-memory кэшем.
 * Успех — 10 мин; ошибка (401 и т.п.) — 60 сек, чтобы не залипать после смены токена.
 */
async function fetchGitLabMergeRequestFact(
  link: string,
  options?: { token?: string }
): Promise<GitLabMergeRequestFact> {
  const token = options?.token ?? process.env.GITLAB_TOKEN;
  const normalized = normalizeCacheLink(link);
  if (!normalized) {
    return emptyFact(link, 'fetch_failed');
  }
  if (!token) {
    return emptyFact(normalized, 'token_missing');
  }

  const cacheKey = cacheKeys.gitlabMergeRequestFact(normalized);
  const cached = apiCache.get<GitLabMergeRequestFact>(cacheKey);
  if (cached) {
    return cached;
  }

  const fact = await fetchUncachedMergeRequestFact(normalized, token);
  const ttl = fact.error
    ? GITLAB_MR_FACT_ERROR_CACHE_TTL_SECONDS
    : GITLAB_MR_FACT_CACHE_TTL_SECONDS;
  apiCache.set(cacheKey, fact, ttl);
  return fact;
}

export async function fetchGitLabMergeRequestFacts(
  links: string[],
  options?: { token?: string }
): Promise<Record<string, GitLabMergeRequestFact>> {
  const unique = Array.from(new Set(links.map((l) => l.trim()).filter(Boolean)));
  const entries = await Promise.all(
    unique.map(async (link) => [link, await fetchGitLabMergeRequestFact(link, options)] as const)
  );
  return Object.fromEntries(entries);
}
