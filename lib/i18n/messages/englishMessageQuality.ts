/**
 * Optional stricter checks for English message leaves (empty strings, obvious placeholders).
 * Used by `pnpm check:i18n` and Vitest; allowlists live in `scripts/i18n/english-quality-allowlist.json`.
 */

import {
  collectEnglishLeafQualityIssues,
  type EnglishQualityIssue,
} from './englishMessageQualityHelpers';


export function analyzeEnglishLeafQuality(
  enMessagesRoot: unknown,
  options?: {
    allowEmptyKeys?: Set<string>;
    allowPlaceholderKeys?: Set<string>;
  }
): EnglishQualityIssue[] {
  return collectEnglishLeafQualityIssues(
    enMessagesRoot,
    options?.allowEmptyKeys ?? new Set<string>(),
    options?.allowPlaceholderKeys ?? new Set<string>()
  );
}
