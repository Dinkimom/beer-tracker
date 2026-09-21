import { NextRequest, NextResponse } from 'next/server';

import {
  resolveValidateTokenApiClient,
  validateOrganizationIdConsistency,
  validateTokenErrorResponse,
  validateTokenRequestBody,
} from '@/lib/auth/validateTokenRouteHelpers';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

/**
 * Валидирует OAuth токен, делая тестовый запрос к Yandex Tracker API.
 * Cloud Org ID — из заголовка X-Organization-Id или тела `organizationId` при сессии продукта
 * (контекст организации из БД).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      organizationId?: unknown;
      token?: unknown;
    };
    const tokenResult = validateTokenRequestBody(body);
    if (tokenResult instanceof NextResponse) {
      return tokenResult;
    }
    const { cleanedToken, email } = tokenResult;

    const rawHeader = request.headers.get(TENANT_ORG_HEADER)?.trim() ?? '';
    const rawBodyOrg =
      typeof body.organizationId === 'string' ? body.organizationId.trim() : '';
    const orgMismatch = validateOrganizationIdConsistency(rawHeader, rawBodyOrg);
    if (orgMismatch) {
      return orgMismatch;
    }

    const clientResult = await resolveValidateTokenApiClient(
      request,
      body.organizationId,
      cleanedToken,
      email
    );
    if (clientResult instanceof NextResponse) {
      return clientResult;
    }

    await clientResult.get('/myself');

    return NextResponse.json({
      message: 'Token is valid',
      valid: true,
    });
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown; status?: number }; message?: string };
    console.error('[validateToken] Error:', {
      data: axiosError.response?.data,
      message: axiosError.message,
      status: axiosError.response?.status,
    });
    return validateTokenErrorResponse(error);
  }
}
