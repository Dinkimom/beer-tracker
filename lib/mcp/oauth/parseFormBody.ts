/** Parse application/x-www-form-urlencoded or JSON body for OAuth token/revoke. */
export async function parseOAuthRequestBody(
  request: Request
): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json: unknown = await request.json().catch(() => null);
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
      if (typeof value === 'string') {
        out[key] = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        out[key] = String(value);
      }
    }
    return out;
  }

  const text = await request.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

export function readClientCredentials(body: Record<string, string>, request: Request): {
  clientId: string;
  clientSecret: string | null;
} {
  const basic = request.headers.get('authorization');
  if (basic?.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(basic.slice(6).trim(), 'base64').toString('utf8');
      const colon = decoded.indexOf(':');
      if (colon >= 0) {
        return {
          clientId: decoded.slice(0, colon),
          clientSecret: decoded.slice(colon + 1) || null,
        };
      }
    } catch {
      /* fall through */
    }
  }
  return {
    clientId: body.client_id?.trim() ?? '',
    clientSecret: body.client_secret?.trim() || null,
  };
}
