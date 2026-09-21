import { createHmac, timingSafeEqual } from 'crypto';

import { getAuthSessionSecret } from '@/lib/env';


const VERSION = 'v1';

interface SessionPayload {
  exp: number;
  iat: number;
  sub: string;
}

export function verifySessionTokenSignature(payloadB64: string, sig: string): boolean {
  const secret = getAuthSessionSecret();
  const expectedSig = createHmac('sha256', secret)
    .update(`${VERSION}.${payloadB64}`)
    .digest('base64url');
  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function parseValidSessionPayload(payloadB64: string): { userId: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as SessionPayload).sub !== 'string' ||
    typeof (parsed as SessionPayload).exp !== 'number'
  ) {
    return null;
  }
  const { exp, sub } = parsed as SessionPayload;
  if (exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return { userId: sub };
}

export { VERSION as SESSION_TOKEN_VERSION };
