/**
 * Чтение значений полей из payload задачи трекера (в т.ч. кастомные ключи).
 */

import type { TrackerIssue } from '@/types/tracker';

import {
  readIssueTagTokensFromArray,
  readMergeRequestLinkValue,
  readRawFieldValueFromIssue,
  readStringTokenValue,
  readUserRefFromValue,
} from './issueFieldUtilsReadHelpers';

function parseTrimmedNumberString(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    return parseTrimmedNumberString(v);
  }
  return undefined;
}

function pushUniqueToken(out: string[], value: unknown): void {
  const token = typeof value === 'string' ? value.trim() : '';
  if (token && !out.includes(token)) {
    out.push(token);
  }
}

function pushObjectStringTokens(out: string[], value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return;
  }
  const obj = value as {
    display?: string;
    id?: string;
    key?: string;
    name?: string;
    value?: string;
  };
  pushUniqueToken(out, obj.key);
  pushUniqueToken(out, obj.display);
  pushUniqueToken(out, obj.name);
  pushUniqueToken(out, obj.value);
  pushUniqueToken(out, obj.id);
}

function pushArrayStringTokens(out: string[], values: unknown[]): void {
  for (const item of values) {
    if (typeof item === 'string') {
      pushUniqueToken(out, item);
      continue;
    }
    pushObjectStringTokens(out, item);
  }
}

/**
 * Возвращает числовую оценку по идентификатору поля (встроенные storyPoints/testPoints или произвольный ключ на issue).
 */
export function readNumericEstimateFromIssue(
  issue: TrackerIssue,
  fieldId: string | undefined
): number | undefined {
  if (!fieldId) {
    return undefined;
  }
  if (fieldId === 'storyPoints') {
    return issue.storyPoints ?? undefined;
  }
  if (fieldId === 'testPoints') {
    return issue.testPoints ?? undefined;
  }
  return asNumber(readRawFieldValueFromIssue(issue, fieldId));
}

/**
 * Строковое поле со ссылкой (MR и т.п.): строка или объект со self/href/url.
 */
export function readMergeRequestLinkFromIssue(
  issue: TrackerIssue,
  fieldId: string | undefined
): string {
  if (!fieldId?.trim()) {
    return '';
  }
  return readMergeRequestLinkValue(readRawFieldValueFromIssue(issue, fieldId));
}

export function readStringTokenFromIssue(issue: TrackerIssue, fieldId: string | undefined): string {
  if (!fieldId) {
    return '';
  }
  if (fieldId === 'functionalTeam') {
    return (issue.functionalTeam ?? '').trim();
  }
  return readStringTokenValue(readRawFieldValueFromIssue(issue, fieldId));
}

/**
 * Возвращает все возможные строковые представления поля.
 * Нужно для надёжного сравнения eq в правилах (key/display/id/строка).
 */
export function readStringTokensFromIssue(issue: TrackerIssue, fieldId: string | undefined): string[] {
  const one = readStringTokenFromIssue(issue, fieldId).trim();
  const out = one ? [one] : [];
  if (!fieldId) {
    return out;
  }
  const raw = readRawFieldValueFromIssue(issue, fieldId);
  if (Array.isArray(raw)) {
    pushArrayStringTokens(out, raw);
    return out;
  }
  pushObjectStringTokens(out, raw);
  return out;
}

interface TrackerUserRef {
  display: string;
  id: string;
}

/** Читает пользовательское поле (assignee-подобное) с issue. */
export function readUserRefFromIssue(
  issue: TrackerIssue,
  fieldId: string | undefined
): TrackerUserRef | undefined {
  if (!fieldId) {
    return undefined;
  }
  if (fieldId === 'qaEngineer') {
    const q = issue.qaEngineer;
    if (q?.id) {
      return { display: q.display ?? q.id, id: q.id };
    }
    return undefined;
  }
  return readUserRefFromValue(readRawFieldValueFromIssue(issue, fieldId));
}

/** Нормализованные теги: строки для сопоставления с valueMap. */
export function readIssueTagTokens(issue: TrackerIssue): string[] {
  const rec = issue as unknown as Record<string, unknown>;
  const tags = rec.tags;
  if (!Array.isArray(tags)) {
    return [];
  }
  return readIssueTagTokensFromArray(tags);
}
