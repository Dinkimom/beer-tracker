function escapeJiraJqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function looksLikeExactIssueKey(query: string): boolean {
  return /^[A-Z][A-Z0-9]+-\d+$/i.test(query.trim());
}

function looksLikeIssueKeyPrefix(query: string): boolean {
  return /^[A-Z][A-Z0-9]*-/i.test(query.trim());
}

/** Summary/key фильтр без scope доски (для Agile /board/{id}/issue?jql=). */
export function buildJiraIssueSearchTextClause(queryText: string): string {
  const trimmed = queryText.trim();
  if (!trimmed) {
    return '';
  }
  const escaped = escapeJiraJqlString(trimmed);
  const clauses: string[] = [`summary ~ "${escaped}*"`];
  if (looksLikeExactIssueKey(trimmed)) {
    clauses.push(`key = "${escapeJiraJqlString(trimmed.toUpperCase())}"`);
  } else if (looksLikeIssueKeyPrefix(trimmed)) {
    clauses.push(`key ~ "${escapeJiraJqlString(trimmed.toUpperCase())}*"`);
  }
  return clauses.length === 1 ? clauses[0]! : `(${clauses.join(' OR ')})`;
}

export function appendJiraJqlAnd(base: string, extra?: string): string {
  const bit = extra?.trim();
  if (!base || !bit) {
    return base;
  }
  return `${base} AND ${bit}`;
}

export function buildJiraBoardScopeJql(boardId: number, projectKey?: string | null): string {
  const key = projectKey?.trim();
  if (key) {
    return `project = "${escapeJiraJqlString(key)}"`;
  }
  return `board = ${boardId}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC `yyyy-MM-dd HH:mm` for JQL datetime comparisons. */
export function formatJiraJqlDateTimeUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

export function buildJiraQueueScopeJql(queueKey: string): string {
  return `project = "${escapeJiraJqlString(queueKey.trim())}"`;
}

export function buildJiraQueuesScopeJql(queueKeys: string[]): string {
  const keys = [...new Set(queueKeys.map((key) => key.trim()).filter(Boolean))];
  if (keys.length === 0) {
    return '';
  }
  if (keys.length === 1) {
    return buildJiraQueueScopeJql(keys[0]!);
  }
  const quoted = keys.map((key) => `"${escapeJiraJqlString(key)}"`).join(', ');
  return `project in (${quoted})`;
}

/** Incremental sync window: `updated` in [since, until] UTC. */
export function buildJiraUpdatedRangeJql(
  since: Date,
  until: Date,
  options?: { queueKeys?: string[] }
): string {
  const range = `updated >= "${formatJiraJqlDateTimeUtc(since)}" AND updated <= "${formatJiraJqlDateTimeUtc(until)}"`;
  const queues = options?.queueKeys != null ? buildJiraQueuesScopeJql(options.queueKeys) : '';
  const scoped = queues ? `${queues} AND ${range}` : range;
  return `${scoped} ORDER BY updated ASC`;
}

/** JQL для поиска задач (паритет с buildIssueSearchQueryOnBoard в trackerApi/issues.ts). */
export function buildJiraIssueSearchJql(
  boardId: number,
  queryText: string,
  options?: { extraAnd?: string; projectKey?: string | null }
): string {
  const textClause = buildJiraIssueSearchTextClause(queryText);
  if (!textClause) {
    return '';
  }
  return appendJiraJqlAnd(
    appendJiraJqlAnd(buildJiraBoardScopeJql(boardId, options?.projectKey), options?.extraAnd),
    textClause
  );
}
