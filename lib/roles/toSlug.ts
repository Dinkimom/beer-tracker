/**
 * Генерация slug из произвольной строки: кириллица → латиница, kebab-case, [a-z0-9-].
 */

import { mapCharToSlugPart, normalizeSlugOutput } from './toSlugHelpers';

/**
 * Транслитерация + нормализация в slug для org_roles (без подчёркиваний; только a-z, цифры, дефис).
 */
export function toSlug(input: string): string {
  let out = '';
  for (const ch of input.trim().toLowerCase()) {
    out += mapCharToSlugPart(ch);
  }
  return normalizeSlugOutput(out);
}
