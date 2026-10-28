import { NextResponse } from 'next/server';

import { resolveParams } from '@/lib/nextjs-utils';
import { IssueKeyParamSchema } from '@/lib/validation';

type IssueRouteParams = Record<string, string> & { issueKey: string };

/**
 * Начало роутов `/api/issues/[issueKey]/…`: `issueKey` по `IssueKeyParamSchema` и непустые
 * сегменты из `required` (`itemId`, `linkId`), иначе 400. Tenant роут проверяет сам: часть роутов —
 * прокси трекера по токену пользователя.
 */
export async function resolveIssueRouteParams<T extends IssueRouteParams>(
  params: Promise<T> | T,
  required: ReadonlyArray<Exclude<string & keyof T, 'issueKey'>> = []
): Promise<{ issueKey: string; params: T } | { response: NextResponse }> {
  const resolved = await resolveParams(params);
  const issueKeyValid = IssueKeyParamSchema.safeParse({ issueKey: resolved.issueKey }).success;
  if (!issueKeyValid || required.some((name) => !resolved[name])) {
    const names = ['issueKey', ...required];
    const error = names.length > 1 ? `${names.join(' and ')} are required` : 'issueKey is required';
    return { response: NextResponse.json({ error }, { status: 400 }) };
  }
  return { issueKey: resolved.issueKey, params: resolved };
}
