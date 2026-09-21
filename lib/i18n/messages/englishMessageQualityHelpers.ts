import { flattenMessagesToDotMap } from './messageTree';

type EnglishQualityIssueKind = 'empty' | 'placeholder';

export interface EnglishQualityIssue {
  detail: string;
  key: string;
  kind: EnglishQualityIssueKind;
}

/** Detects common unfinished-translation markers at the start of a leaf string. */
function looksLikePlaceholderLeaf(trimmed: string): boolean {
  const markerTodo = 'TO' + 'DO';
  const markerTbd = 'TBD';
  const markerFixme = 'FIX' + 'ME';
  const exact = new RegExp(`^(${markerTodo}|${markerTbd}|${markerFixme})$`, 'i');
  if (exact.test(trimmed)) {
    return true;
  }
  return new RegExp(`^(${markerTodo}|${markerTbd}|${markerFixme})\\s*[:.\\-\\u2013\\u2014]`, 'i').test(trimmed);
}

function inspectEnglishLeafKey(
  key: string,
  raw: string,
  allowEmpty: Set<string>,
  allowPlaceholder: Set<string>,
  issues: EnglishQualityIssue[]
): void {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    if (!allowEmpty.has(key)) {
      issues.push({ key, kind: 'empty', detail: 'empty or whitespace-only English string' });
    }
    return;
  }
  if (!allowPlaceholder.has(key) && looksLikePlaceholderLeaf(trimmed)) {
    issues.push({
      key,
      kind: 'placeholder',
      detail: `suspected placeholder: ${JSON.stringify(trimmed.slice(0, 80))}`,
    });
  }
}

export function collectEnglishLeafQualityIssues(
  enMessagesRoot: unknown,
  allowEmpty: Set<string>,
  allowPlaceholder: Set<string>
): EnglishQualityIssue[] {
  const flat = flattenMessagesToDotMap(enMessagesRoot);
  const issues: EnglishQualityIssue[] = [];
  for (const key of Object.keys(flat).sort()) {
    inspectEnglishLeafKey(key, flat[key], allowEmpty, allowPlaceholder, issues);
  }
  return issues;
}
