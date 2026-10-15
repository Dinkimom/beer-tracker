import { createHash, randomBytes } from 'crypto';

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}
