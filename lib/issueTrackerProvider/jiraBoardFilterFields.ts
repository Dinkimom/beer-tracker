import type { AxiosInstance } from 'axios';

import { extractTrackerMetadataArray } from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

import { axiosErrorStatusAndDetails } from './jiraAgileAuthError';
import { jiraAgileBoardConfigurationUrl } from './jiraBoardParams';

/**
 * В Jira задача попадает на доску по JQL-фильтру доски, а не по полю «доска».
 * Перенос в спринт через Agile API фильтр не учитывает: без, например, поля Team
 * задача в спринте есть, но на доске её не видно. Здесь берём из фильтра простые
 * условия `field = value` / `field in (value)`, объединённые через AND, и проставляем их.
 */

interface JiraJqlEqualityClause {
  field: string;
  value: string;
}

interface JqlToken {
  kind: 'comma' | 'lparen' | 'op' | 'rparen' | 'string' | 'word';
  text: string;
}

interface JiraFieldCatalogRow {
  clauseNames?: unknown;
  id?: string;
  name?: string;
  schema?: { custom?: string; items?: string; system?: string; type?: string };
}

type JiraUpdateOperation = { add: unknown } | { set: unknown };

const JQL_OPERATOR = /^(?:!=|!~|>=|<=|=|~|>|<)/;
const JQL_WORD_STOP = /[\s"'(),=!~<>]/;
const JQL_EMPTY_VALUES = new Set(['empty', 'null']);
const SETTABLE_SYSTEM_FIELDS = new Set(['components', 'fixVersions', 'labels']);

function readQuotedJqlString(jql: string, start: number): { end: number; text: string } {
  const quote = jql[start];
  let text = '';
  let index = start + 1;
  while (index < jql.length && jql[index] !== quote) {
    if (jql[index] === '\\' && index + 1 < jql.length) {
      index += 1;
    }
    text += jql[index];
    index += 1;
  }
  return { end: index + 1, text };
}

function readJqlWord(jql: string, start: number): { end: number; text: string } {
  let index = start;
  while (index < jql.length && !JQL_WORD_STOP.test(jql[index]!)) {
    index += 1;
  }
  return { end: index, text: jql.slice(start, index) };
}

const PUNCTUATION_TOKENS: Record<string, JqlToken['kind']> = {
  '(': 'lparen',
  ')': 'rparen',
  ',': 'comma',
};

function tokenizeJql(jql: string): JqlToken[] {
  const tokens: JqlToken[] = [];
  let index = 0;
  while (index < jql.length) {
    const char = jql[index]!;
    const punctuation = PUNCTUATION_TOKENS[char];
    const operator = JQL_OPERATOR.exec(jql.slice(index))?.[0];
    if (/\s/.test(char)) {
      index += 1;
    } else if (punctuation) {
      tokens.push({ kind: punctuation, text: char });
      index += 1;
    } else if (operator) {
      tokens.push({ kind: 'op', text: operator });
      index += operator.length;
    } else if (char === '"' || char === "'") {
      const quoted = readQuotedJqlString(jql, index);
      tokens.push({ kind: 'string', text: quoted.text });
      index = quoted.end;
    } else {
      const word = readJqlWord(jql, index);
      tokens.push({ kind: 'word', text: word.text });
      index = Math.max(word.end, index + 1);
    }
  }
  return tokens;
}

function isKeyword(token: JqlToken | undefined, keyword: string): boolean {
  return token?.kind === 'word' && token.text.toLowerCase() === keyword;
}

function depthDelta(token: JqlToken): number {
  if (token.kind === 'lparen') {
    return 1;
  }
  return token.kind === 'rparen' ? -1 : 0;
}

function stripJqlOrderBy(tokens: JqlToken[]): JqlToken[] {
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    depth += depthDelta(tokens[index]!);
    if (depth === 0 && isKeyword(tokens[index], 'order') && isKeyword(tokens[index + 1], 'by')) {
      return tokens.slice(0, index);
    }
  }
  return tokens;
}

/** Делит по верхнеуровневым AND; `null`, если на верхнем уровне есть OR/NOT. */
function splitTopLevelAnd(tokens: JqlToken[]): JqlToken[][] | null {
  const parts: JqlToken[][] = [[]];
  let depth = 0;
  for (const token of tokens) {
    depth += depthDelta(token);
    if (depth === 0 && (isKeyword(token, 'or') || isKeyword(token, 'not'))) {
      return null;
    }
    if (depth === 0 && isKeyword(token, 'and')) {
      parts.push([]);
    } else {
      parts.at(-1)!.push(token);
    }
  }
  return parts;
}

function isWrappedInParens(tokens: JqlToken[]): boolean {
  if (tokens[0]?.kind !== 'lparen' || tokens.at(-1)?.kind !== 'rparen') {
    return false;
  }
  let depth = 0;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    depth += depthDelta(tokens[index]!);
    if (depth === 0) {
      return false;
    }
  }
  return true;
}

function isJqlValue(token: JqlToken | undefined): token is JqlToken {
  return token?.kind === 'string' || token?.kind === 'word';
}

function clauseValueToken(tokens: JqlToken[]): JqlToken | null {
  if (tokens.length === 3 && tokens[1]?.kind === 'op' && tokens[1].text === '=') {
    return isJqlValue(tokens[2]) ? tokens[2] : null;
  }
  const isSingleIn =
    tokens.length === 5 &&
    isKeyword(tokens[1], 'in') &&
    tokens[2]?.kind === 'lparen' &&
    tokens[4]?.kind === 'rparen';
  return isSingleIn && isJqlValue(tokens[3]) ? tokens[3] : null;
}

function parseEqualityClause(tokens: JqlToken[]): JiraJqlEqualityClause | null {
  const valueToken = clauseValueToken(tokens);
  if (!valueToken || !isJqlValue(tokens[0])) {
    return null;
  }
  const value = valueToken.text.trim();
  const field = tokens[0].text.trim();
  if (!field || !value || (valueToken.kind === 'word' && JQL_EMPTY_VALUES.has(value.toLowerCase()))) {
    return null;
  }
  return { field, value };
}

function collectEqualityClauses(tokens: JqlToken[]): JiraJqlEqualityClause[] {
  const parts = splitTopLevelAnd(tokens);
  if (!parts) {
    return [];
  }
  return parts.flatMap((part) => {
    if (isWrappedInParens(part)) {
      return collectEqualityClauses(part.slice(1, -1));
    }
    const clause = parseEqualityClause(part);
    return clause ? [clause] : [];
  });
}

export function parseJiraBoardFilterEqualityClauses(jql: string): JiraJqlEqualityClause[] {
  return collectEqualityClauses(stripJqlOrderBy(tokenizeJql(jql)));
}

function normalizeClauseName(raw: string): string {
  const name = raw.trim().toLowerCase();
  const customFieldId = /^customfield_(\d+)$/.exec(name)?.[1];
  return customFieldId ? `cf[${customFieldId}]` : name;
}

function catalogRowClauseNames(row: JiraFieldCatalogRow): Set<string> {
  const names = Array.isArray(row.clauseNames)
    ? row.clauseNames.filter((name): name is string => typeof name === 'string')
    : [];
  return new Set(
    [...names, row.name ?? '', row.id ?? ''].filter(Boolean).map((name) => normalizeClauseName(name))
  );
}

function isSettableBoardField(row: JiraFieldCatalogRow): boolean {
  const id = row.id ?? '';
  return id.startsWith('customfield_') || SETTABLE_SYSTEM_FIELDS.has(id);
}

function findJiraFieldForClause(
  catalog: unknown[],
  clauseField: string
): JiraFieldCatalogRow | null {
  const wanted = normalizeClauseName(clauseField);
  for (const raw of catalog) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const row = raw as JiraFieldCatalogRow;
    if (isSettableBoardField(row) && catalogRowClauseNames(row).has(wanted)) {
      return row;
    }
  }
  return null;
}

function optionRef(value: string): { id: string } | { value: string } {
  return /^\d+$/.test(value) ? { id: value } : { value };
}

function isTeamField(schema: NonNullable<JiraFieldCatalogRow['schema']>): boolean {
  return schema.type === 'team' || /team/i.test(schema.custom ?? '');
}

function arrayItemOperation(items: string | undefined, value: string): JiraUpdateOperation | null {
  if (items === 'string') {
    return { add: value };
  }
  if (items === 'component' || items === 'version') {
    return { add: { name: value } };
  }
  return items === 'option' ? { add: optionRef(value) } : null;
}

function scalarOperation(type: string | undefined, value: string): JiraUpdateOperation | null {
  if (type === 'string') {
    return { set: value };
  }
  if (type === 'option') {
    return { set: optionRef(value) };
  }
  const numeric = Number(value);
  return type === 'number' && Number.isFinite(numeric) ? { set: numeric } : null;
}

function jiraBoardFieldUpdateOperation(
  row: JiraFieldCatalogRow,
  value: string
): JiraUpdateOperation | null {
  const schema = row.schema ?? {};
  if (isTeamField(schema)) {
    return { set: value };
  }
  return schema.type === 'array'
    ? arrayItemOperation(schema.items, value)
    : scalarOperation(schema.type, value);
}

export function buildJiraBoardFilterFieldUpdates(
  jql: string,
  catalog: unknown[]
): Array<{ fieldId: string; operation: JiraUpdateOperation }> {
  const updates: Array<{ fieldId: string; operation: JiraUpdateOperation }> = [];
  for (const clause of parseJiraBoardFilterEqualityClauses(jql)) {
    const row = findJiraFieldForClause(catalog, clause.field);
    const operation = row ? jiraBoardFieldUpdateOperation(row, clause.value) : null;
    if (row?.id && operation) {
      updates.push({ fieldId: row.id, operation });
    }
  }
  return updates;
}

function readFilterId(data: unknown): string | null {
  const raw = (data as { filter?: { id?: unknown } } | null)?.filter?.id;
  const id = raw == null ? '' : String(raw).trim();
  return /^\d+$/.test(id) ? id : null;
}

async function fetchJiraBoardFilterJql(api: AxiosInstance, boardId: number): Promise<string | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return null;
  }
  const { data: config } = await api.get<unknown>(jiraAgileBoardConfigurationUrl(baseUrl, boardId));
  const filterId = readFilterId(config);
  if (!filterId) {
    return null;
  }
  const { data: filter } = await api.get<{ jql?: unknown }>(`/filter/${filterId}`);
  return typeof filter?.jql === 'string' && filter.jql.trim() ? filter.jql : null;
}

/**
 * Проставляет задаче поля из JQL-фильтра доски, чтобы она отображалась на доске в Jira.
 * Best-effort: ошибки логируются и не прерывают перенос в спринт.
 */
export async function applyJiraBoardFilterFields(
  api: AxiosInstance,
  issueKey: string,
  boardId: number
): Promise<void> {
  try {
    const jql = await fetchJiraBoardFilterJql(api, boardId);
    if (!jql || parseJiraBoardFilterEqualityClauses(jql).length === 0) {
      return;
    }
    const { data } = await api.get<unknown>('/field');
    const updates = buildJiraBoardFilterFieldUpdates(jql, extractTrackerMetadataArray(data));
    const results = await Promise.allSettled(
      updates.map(({ fieldId, operation }) =>
        api.put(`/issue/${encodeURIComponent(issueKey)}`, { update: { [fieldId]: [operation] } })
      )
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const { details, status } = axiosErrorStatusAndDetails(result.reason);
        console.warn('[jira] board filter field update failed', {
          boardId,
          details,
          fieldId: updates[index]?.fieldId,
          issueKey,
          status,
        });
      }
    });
  } catch (error) {
    const { details, status } = axiosErrorStatusAndDetails(error);
    console.warn('[jira] board filter lookup failed', { boardId, details, issueKey, status });
  }
}
