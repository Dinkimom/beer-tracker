import { NextRequest, NextResponse } from 'next/server';

import {
  authorizeParamsFromBody,
  handleAuthorizeFlow,
  parseAuthorizeQuery,
} from '@/lib/mcp/oauth/authorizeHelpers';
import { oauthErrorResponse, oauthOptions } from '@/lib/mcp/oauth/oauthHttp';
import { parseOAuthRequestBody } from '@/lib/mcp/oauth/parseFormBody';

export const dynamic = 'force-dynamic';

/**
 * Authorization endpoint: redirect to login/consent, or issue code after approve.
 * GET = start flow (pending consent). POST = approve/deny from consent form.
 */
export async function GET(request: NextRequest) {
  try {
    const params = parseAuthorizeQuery(new URL(request.url));
    const responseType = new URL(request.url).searchParams.get('response_type');
    if (responseType && responseType !== 'code') {
      return NextResponse.json(
        { error: 'unsupported_response_type', error_description: 'Only code is supported' },
        { status: 400 }
      );
    }
    return await handleAuthorizeFlow({ decision: 'pending', params, request });
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseOAuthRequestBody(request);
    const params = authorizeParamsFromBody(body);
    const decision = body.decision === 'deny' ? 'deny' : 'approve';
    return await handleAuthorizeFlow({ decision, params, request });
  } catch (error) {
    return oauthErrorResponse(error);
  }
}

export function OPTIONS() {
  return oauthOptions();
}
