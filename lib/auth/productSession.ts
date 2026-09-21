/**
 * Извлечение userId из запроса по cookie сессии продукта.
 */

import { getProductSessionTokenFromRequest } from './cookies';
import { verifyProductSessionToken } from './sessionToken';

export function getProductUserIdFromRequest(request: Request): string | null {
  try {
    const raw = getProductSessionTokenFromRequest(request);
    if (!raw) {
      return null;
    }
    return verifyProductSessionToken(raw)?.userId ?? null;
  } catch {
    return null;
  }
}
