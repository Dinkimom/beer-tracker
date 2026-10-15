import { createHash, timingSafeEqual } from 'crypto';

/** RFC 7636 S256: BASE64URL(SHA256(code_verifier)) === code_challenge */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  if (!codeVerifier || !codeChallenge) {
    return false;
  }
  const digest = createHash('sha256').update(codeVerifier, 'utf8').digest('base64url');
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(codeChallenge);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
