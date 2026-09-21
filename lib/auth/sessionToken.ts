/**
 * Подписанный токен сессии: v1.<base64url(payload)>.<base64url(hmac)>
 */

import { createHmac } from 'crypto';

import { getAuthSessionSecret } from '@/lib/env';

import { PRODUCT_SESSION_MAX_AGE_SEC } from './constants';
import {
  parseValidSessionPayload,
  SESSION_TOKEN_VERSION,
  verifySessionTokenSignature,
} from './sessionTokenHelpers';

interface SessionPayload {
  exp: number;
  iat: number;
  sub: string;
}

export function signProductSessionToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    exp: now + PRODUCT_SESSION_MAX_AGE_SEC,
    iat: now,
    sub: userId,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const secret = getAuthSessionSecret();
  const sig = createHmac('sha256', secret)
    .update(`${SESSION_TOKEN_VERSION}.${payloadB64}`)
    .digest('base64url');
  return `${SESSION_TOKEN_VERSION}.${payloadB64}.${sig}`;
}

export function verifyProductSessionToken(token: string): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== SESSION_TOKEN_VERSION) {
    return null;
  }
  const payloadB64 = parts[1]!;
  const sig = parts[2]!;
  if (!verifySessionTokenSignature(payloadB64, sig)) {
    return null;
  }
  return parseValidSessionPayload(payloadB64);
}
