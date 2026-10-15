/**
 * RFC 8252 §7.3: allow any port for loopback redirect URIs.
 * Non-loopback: exact match.
 */
export function redirectUriMatches(requested: string, registered: string): boolean {
  let reqUrl: URL;
  let regUrl: URL;
  try {
    reqUrl = new URL(requested);
    regUrl = new URL(registered);
  } catch {
    return false;
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (loopbackHosts.has(reqUrl.hostname) && loopbackHosts.has(regUrl.hostname)) {
    return (
      reqUrl.protocol === regUrl.protocol &&
      reqUrl.pathname === regUrl.pathname &&
      reqUrl.search === regUrl.search &&
      reqUrl.hash === regUrl.hash
    );
  }

  return requested === registered;
}

export function clientAllowsRedirectUri(
  redirectUris: readonly string[],
  requested: string
): boolean {
  return redirectUris.some((uri) => redirectUriMatches(requested, uri));
}
