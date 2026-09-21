import type { AxiosError } from 'axios';

import { NextRequest, NextResponse } from 'next/server';

import { getIssueTrackerProviderKind } from '@/lib/env';
import {
  cleanJiraBasicAuthEmail,
  JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
  jiraCloudRequiresBasicAuthEmail,
  jiraEmailFromRequest,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import { createTrackerApiClient } from '@/lib/tracker-client';
import { userMessageFromYandexTrackerErrorBody } from '@/lib/trackerApi/yandexTrackerErrorMessages';
import {
  TrackerApiConfigError,
  resolveValidateTokenTrackerContext,
} from '@/lib/trackerRequestConfig';

export function validateTokenRequestBody(body: {
  email?: unknown;
  organizationId?: unknown;
  token?: unknown;
}): NextResponse | { cleanedToken: string; email: string } {
  const { token } = body;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token is required', valid: false }, { status: 400 });
  }
  const cleanedToken = token.replace(/\s+/g, '').trim();
  if (!cleanedToken) {
    return NextResponse.json(
      { error: 'Token cannot be empty after cleaning', valid: false },
      { status: 400 }
    );
  }
  return {
    cleanedToken,
    email: typeof body.email === 'string' ? cleanJiraBasicAuthEmail(body.email) : '',
  };
}

export function validateOrganizationIdConsistency(
  rawHeader: string,
  rawBodyOrg: string
): NextResponse | null {
  if (rawHeader && rawBodyOrg && rawHeader !== rawBodyOrg) {
    return NextResponse.json(
      {
        error: 'organizationId в теле запроса не совпадает с заголовком X-Organization-Id',
        valid: false,
      },
      { status: 400 }
    );
  }
  return null;
}

export async function resolveValidateTokenApiClient(
  request: NextRequest,
  organizationId: unknown,
  cleanedToken: string,
  bodyEmail: string
): Promise<NextResponse | ReturnType<typeof createTrackerApiClient>> {
  try {
    const ctx = await resolveValidateTokenTrackerContext(request, organizationId);
    const jiraEmail = bodyEmail || jiraEmailFromRequest(request);
    if (jiraCloudRequiresBasicAuthEmail(getIssueTrackerProviderKind()) && !jiraEmail) {
      return NextResponse.json(
        { error: JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE, valid: false },
        { status: 400 }
      );
    }
    return createTrackerApiClient({
      apiUrl: ctx.apiUrl,
      jiraEmail,
      oauthToken: cleanedToken,
      orgId: ctx.orgId,
    });
  } catch (e) {
    if (e instanceof TrackerApiConfigError) {
      return NextResponse.json({ error: e.message, valid: false }, { status: e.status });
    }
    throw e;
  }
}

export function validateTokenErrorResponse(error: unknown): NextResponse {
  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  const errorMessage = resolveTokenValidationErrorMessage(status, axiosError);
  return NextResponse.json(
    {
      details: axiosError.response?.data,
      error: errorMessage,
      valid: false,
    },
    { status: 200 }
  );
}

function resolveTokenValidationErrorMessage(status: number | undefined, axiosError: AxiosError): string {
  if (status === 401) {
    return 'Недействительный токен. Пожалуйста, получите новый токен.';
  }
  if (status === 403) {
    return 'Организация трекера недоступна для этого токена. Проверьте Cloud Org ID в админке и права токена.';
  }
  if (status === 404) {
    return 'Неверный формат токена или организация не найдена.';
  }
  return userMessageFromYandexTrackerErrorBody(axiosError.response?.data) ?? 'Failed to validate token';
}
