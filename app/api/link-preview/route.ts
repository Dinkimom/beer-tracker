import { NextRequest } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { handleLinkPreviewGet } from '@/lib/comments/linkPreviewRouteHelpers';

/**
 * GET /api/link-preview?url=
 * Заголовок и иконка публичной http(s)-страницы для бейджей ссылок в заметках.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    return handleLinkPreviewGet(request.nextUrl.searchParams.get('url'));
  } catch (error) {
    return handleApiError(error, 'fetch link preview');
  }
}
