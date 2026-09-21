/** Снимок readiness MR (как в Releases). */
export interface GitLabMergeRequestChecks {
  approvalsDone: number | null;
  approvalsRequired: number;
  lintSuccess: boolean | null;
  testsSuccess: boolean | null;
}

/** Точечные события GitLab для таймлайна факта. */
type GitLabFactEventKind =
  | 'approved'
  | 'merged'
  | 'pipeline_failed'
  | 'pipeline_success';

export interface GitLabFactEvent {
  at: string;
  kind: GitLabFactEventKind;
  /** Краткий текст для тултипа (автор апрува, id пайплайна). */
  label?: string;
}

export type GitLabMergeRequestFactError =
  | 'fetch_failed'
  | 'not_found'
  | 'token_missing'
  | 'unauthorized';

/** Полные данные MR для факта + checks. */
export interface GitLabMergeRequestFact {
  checks: GitLabMergeRequestChecks;
  /** Если задан — события/checks недоступны (токен, 401, сеть). */
  error?: GitLabMergeRequestFactError;
  events: GitLabFactEvent[];
  link: string;
  mergedAt: string | null;
  webUrl: string | null;
}

/** Успешные ответы — 10 минут; ошибки — короче, чтобы после обновления токена не «залипало». */
export const GITLAB_MR_FACT_CACHE_TTL_SECONDS = 10 * 60;
export const GITLAB_MR_FACT_ERROR_CACHE_TTL_SECONDS = 60;
