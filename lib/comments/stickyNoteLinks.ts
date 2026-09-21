type StickyNoteTextSegment =
  | { href: string; raw: string; type: 'url' }
  | { type: 'text'; value: string };

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const MAX_HREF_LENGTH = 2048;
const TRAILING_URL_PUNCTUATION = new Set([',', '.', ';', ':', '!', '?', ')', ']', '}', "'"]);

export function resolveStickyNoteLinkHostname(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./i, '');
  } catch {
    return href;
  }
}

/** Иконка сайта: google s2, затем DuckDuckGo. Yandex favicon API для tracker.yandex.ru отдаёт PNG 1×1. */
export function resolveStickyNoteFaviconUrl(href: string): string {
  return stickyNoteFaviconServiceUrls(href)[0] ?? '';
}

export function resolveStickyNoteFaviconSources(
  href: string,
  apiFaviconUrl?: string | null
): string[] {
  const candidates = stickyNoteFaviconServiceUrls(href);
  if (!apiFaviconUrl || isBlankFaviconServiceUrl(apiFaviconUrl)) {
    return candidates;
  }
  return [apiFaviconUrl, ...candidates.filter((url) => url !== apiFaviconUrl)];
}

function stickyNoteFaviconServiceUrls(href: string): string[] {
  try {
    const hostname = new URL(href).hostname.replace(/^www\./i, '');
    if (!hostname) {
      return [];
    }
    const encoded = encodeURIComponent(hostname);
    return [
      `https://www.google.com/s2/favicons?domain=${encoded}&sz=32`,
      `https://icons.duckduckgo.com/ip3/${encoded}.ico`,
    ];
  } catch {
    return [];
  }
}

function isBlankFaviconServiceUrl(url: string): boolean {
  return /favicon\.yandex\.net/i.test(url);
}

export function splitStickyNoteTextByUrls(text: string): StickyNoteTextSegment[] {
  const segments: StickyNoteTextSegment[] = [];
  let lastIndex = 0;
  URL_RE.lastIndex = 0;
  let match = URL_RE.exec(text);
  while (match) {
    lastIndex = pushUrlMatchSegment(segments, text, match, lastIndex);
    match = URL_RE.exec(text);
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return mergeAdjacentStickyNoteTextSegments(segments);
}

function pushUrlMatchSegment(
  segments: StickyNoteTextSegment[],
  text: string,
  match: RegExpExecArray,
  lastIndex: number
): number {
  const start = match.index;
  if (start > lastIndex) {
    segments.push({ type: 'text', value: text.slice(lastIndex, start) });
  }
  const trimmed = trimStickyNoteUrlMatch(match[0]);
  const href = normalizeStickyNoteHref(trimmed);
  if (!href) {
    segments.push({ type: 'text', value: match[0] });
    return start + match[0].length;
  }
  segments.push({ href, raw: trimmed, type: 'url' });
  return start + trimmed.length;
}

function trimStickyNoteUrlMatch(raw: string): string {
  let value = raw;
  while (value.length > 0 && isTrailingUrlPunctuation(value)) {
    value = value.slice(0, -1);
  }
  return value;
}

function isTrailingUrlPunctuation(value: string): boolean {
  const last = value.at(-1);
  if (!last || !TRAILING_URL_PUNCTUATION.has(last)) {
    return false;
  }
  if (last === ')') {
    return countChar(value, ')') > countChar(value, '(');
  }
  if (last === ']') {
    return countChar(value, ']') > countChar(value, '[');
  }
  return true;
}

function countChar(value: string, char: string): number {
  let count = 0;
  for (const current of value) {
    if (current === char) {
      count += 1;
    }
  }
  return count;
}

function normalizeStickyNoteHref(raw: string): string | null {
  if (raw.length > MAX_HREF_LENGTH) {
    return null;
  }
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    if (!url.hostname) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

function mergeAdjacentStickyNoteTextSegments(
  segments: StickyNoteTextSegment[]
): StickyNoteTextSegment[] {
  const merged: StickyNoteTextSegment[] = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (segment.type === 'text' && previous?.type === 'text') {
      previous.value += segment.value;
      continue;
    }
    merged.push(segment);
  }
  return merged;
}
