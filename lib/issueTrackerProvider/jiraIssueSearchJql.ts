function escapeJiraJqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function looksLikeIssueKeyPrefix(query: string): boolean {
  return /^[A-Z][A-Z0-9]*-/i.test(query.trim());
}

/**
 * `key ~ "PROJ-67*"` для запросов, похожих на ключ; '' для обычного текста.
 * Находит и PROJ-67, и PROJ-670…; `key =` терял префикс и ронял Agile-запрос с 400,
 * если такой задачи нет.
 */
export function buildJiraIssueKeyPrefixClause(queryText: string): string {
  const trimmed = queryText.trim();
  if (!looksLikeIssueKeyPrefix(trimmed)) {
    return '';
  }
  return `key ~ "${escapeJiraJqlString(trimmed.toUpperCase())}*"`;
}

/** Summary/key фильтр без scope доски (для Agile /board/{id}/issue?jql=). */
export function buildJiraIssueSearchTextClause(queryText: string): string {
  const trimmed = queryText.trim();
  if (!trimmed) {
    return '';
  }
  const summaryClause = `summary ~ "${escapeJiraJqlString(trimmed)}*"`;
  const keyClause = buildJiraIssueKeyPrefixClause(trimmed);
  return keyClause ? `(${summaryClause} OR ${keyClause})` : summaryClause;
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
