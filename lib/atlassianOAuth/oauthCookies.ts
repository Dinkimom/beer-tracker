import { createHash, randomBytes } from 'node:crypto';

import {
  ATLASSIAN_OAUTH_RETURN_COOKIE,
  ATLASSIAN_OAUTH_STATE_COOKIE,
} from './constants';

const COOKIE_MAX_AGE_SEC = 600;

function cookieSecureFlag(): boolean {
  return process.env.NODE_ENV === 'production';
}

function appendCookie(res: Response, name: string, value: string, maxAge: number): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (cookieSecureFlag()) {
    parts.push('Secure');
  }
  res.headers.append('Set-Cookie', parts.join('; '));
}

function clearCookie(res: Response, name: string): void {
  appendCookie(res, name, '', 0);
}

export function createAtlassianOAuthState(): string {
  return randomBytes(24).toString('base64url');
}

export function readCookieValue(request: Request, name: string): string {
  const header = request.headers.get('cookie');
  if (!header) {
    return '';
  }
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return '';
}

/** Short-lived state + return-path cookies of an OAuth redirect flow (Atlassian, Yandex ID). */
interface OAuthFlowCookieNames {
  returnPath: string;
  state: string;
}

const ATLASSIAN_OAUTH_COOKIE_NAMES: OAuthFlowCookieNames = {
  returnPath: ATLASSIAN_OAUTH_RETURN_COOKIE,
  state: ATLASSIAN_OAUTH_STATE_COOKIE,
};

export function setOAuthFlowCookies(
  res: Response,
  names: OAuthFlowCookieNames,
  state: string,
  returnPath: string
): void {
  appendCookie(res, names.state, state, COOKIE_MAX_AGE_SEC);
  appendCookie(res, names.returnPath, returnPath, COOKIE_MAX_AGE_SEC);
}

export function clearOAuthFlowCookies(res: Response, names: OAuthFlowCookieNames): void {
  clearCookie(res, names.state);
  clearCookie(res, names.returnPath);
}

export function setAtlassianOAuthStartCookies(
  res: Response,
  state: string,
  returnPath: string
): void {
  setOAuthFlowCookies(res, ATLASSIAN_OAUTH_COOKIE_NAMES, state, returnPath);
}

export function clearAtlassianOAuthCookies(res: Response): void {
  clearOAuthFlowCookies(res, ATLASSIAN_OAUTH_COOKIE_NAMES);
}

export function sanitizeAtlassianOAuthReturnPath(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('://')) {
    return '/auth-setup';
  }
  if (v.length > 512) {
    return '/auth-setup';
  }
  return v;
}

/** Constant-time-ish compare for OAuth state. */
export function atlassianOAuthStatesMatch(expected: string, actual: string): boolean {
  if (!expected || !actual || expected.length !== actual.length) {
    return false;
  }
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(actual).digest();
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}
