import { resolveStickyNoteLinkHostname } from '@/lib/comments/stickyNoteLinks';

const ISSUE_KEY_RE = /^[A-Za-z][A-Za-z0-9]*-(?:[A-Za-z0-9]+-)*\d+$/;
const GENERIC_TLDS = new Set(['com', 'org', 'net', 'ru', 'io', 'dev', 'app']);
const GENERIC_TITLE_WORDS = new Set([
  'github',
  'gitlab',
  'google',
  'tracker',
  'wikipedia',
  'yandex',
  'youtube',
  'яндекс',
  'трекер',
]);
const BORING_PATH_SEGMENTS = new Set([
  '-',
  'browse',
  'html',
  'index.html',
  'index.php',
  'issue',
  'issues',
  'merge_requests',
  'pages',
  'pull',
  'pulls',
  'w',
  'wiki',
]);
const BRAND_TITLE_SPLIT_RE = /\s{0,8}[|—–•·]\s{0,8}|\s{1,8}-\s{1,8}/;

/** Подпись из самой ссылки: ключ задачи, иначе осмысленный путь, иначе хост. */
export function resolveStickyNoteLinkFallbackLabel(href: string): string {
  try {
    const url = new URL(href);
    const hostname = url.hostname.replace(/^www\./i, '');
    const issueKey = extractIssueKeyFromPath(url.pathname);
    if (issueKey) {
      return issueKey;
    }
    return compactPathLabel(url.pathname) || hostname;
  } catch {
    return href;
  }
}

/**
 * Заголовок бейджа: путь/ключ из URL, HTML-title — только если это страница, а не имя сервиса.
 */
export function resolveStickyNoteLinkBadgeTitle(
  href: string,
  fetchedTitle?: string | null
): string {
  const fallback = resolveStickyNoteLinkFallbackLabel(href);
  const hostname = resolveStickyNoteLinkHostname(href);
  const trimmed = fetchedTitle?.trim() ?? '';
  if (!trimmed || isGenericSiteTitle(trimmed, hostname)) {
    return fallback;
  }
  const stripped = stripBrandSuffix(trimmed, hostname);
  if (!stripped || isGenericSiteTitle(stripped, hostname)) {
    return fallback;
  }
  return composeIssueKeyTitle(fallback, stripped);
}

function extractIssueKeyFromPath(pathname: string): string | null {
  for (const segment of pathSegments(pathname)) {
    if (ISSUE_KEY_RE.test(segment)) {
      return segment;
    }
  }
  return null;
}

function compactPathLabel(pathname: string): string | null {
  const meaningful = pathSegments(pathname).filter(
    (segment) => !BORING_PATH_SEGMENTS.has(segment.toLowerCase())
  );
  if (meaningful.length === 0) {
    return null;
  }
  return meaningful.slice(-2).join('/');
}

function pathSegments(pathname: string): string[] {
  const segments: string[] = [];
  for (const raw of pathname.split('/')) {
    if (!raw) {
      continue;
    }
    segments.push(decodePathSegment(raw));
  }
  return segments;
}

function decodePathSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function composeIssueKeyTitle(fallback: string, title: string): string {
  if (!ISSUE_KEY_RE.test(fallback)) {
    return title;
  }
  if (title.toUpperCase().includes(fallback.toUpperCase())) {
    return title;
  }
  return `${fallback}: ${title}`;
}

function stripBrandSuffix(title: string, hostname: string): string {
  const parts = title.split(BRAND_TITLE_SPLIT_RE).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return title;
  }
  const kept = parts.filter((part) => !isGenericSiteTitle(part, hostname));
  return (kept.length > 0 ? kept : parts).join(' — ');
}

function isGenericSiteTitle(title: string, hostname: string): boolean {
  const normalized = normalizeTitle(title);
  if (!normalized) {
    return true;
  }
  const host = hostname.toLowerCase();
  if (normalized === host || normalized === host.replace(/^www\./, '')) {
    return true;
  }
  const labels = host.split('.').filter((label) => label.length > 2 && !GENERIC_TLDS.has(label));
  if (labels.includes(normalized)) {
    return true;
  }
  const words = normalized.split(' ');
  if (words.length === 1) {
    return GENERIC_TITLE_WORDS.has(words[0]);
  }
  return words.length <= 3 && words.every((word) => GENERIC_TITLE_WORDS.has(word));
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, ' ').trim();
}
