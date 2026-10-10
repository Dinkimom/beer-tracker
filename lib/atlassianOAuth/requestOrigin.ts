/** Origin of the current request (self-hosted callback URL). */
export function requestOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || url.protocol.replace(':', '') || 'https';
    return `${proto}://${forwardedHost}`;
  }
  return url.origin;
}

export function atlassianOAuthCallbackUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/auth/atlassian/callback`;
}
