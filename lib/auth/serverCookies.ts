/**
 * Чтение сессии продукта в Server Components / layouts (next/headers).
 */

import { cookies } from 'next/headers';

import { PRODUCT_SESSION_COOKIE_NAME } from './constants';
import { verifyProductSessionToken } from './sessionToken';

export async function getVerifiedProductUserIdFromServerCookies(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(PRODUCT_SESSION_COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  return verifyProductSessionToken(raw)?.userId ?? null;
}
