import { lookup } from 'node:dns/promises';

import { resolveStickyNoteLinkBadgeTitle } from '@/lib/comments/stickyNoteLinkLabel';
import { resolveStickyNoteFaviconUrl, resolveStickyNoteLinkHostname } from '@/lib/comments/stickyNoteLinks';

import { parseLinkPreviewHtml } from './linkPreviewHtml';
import {
  hasBlockedResolvedAddress,
  inspectLinkPreviewTarget,
} from './linkPreviewSafety';
import { createFallbackLinkPreview, type LinkPreview } from './linkPreviewTypes';

const FETCH_TIMEOUT_MS = 4000;
const MAX_HTML_BYTES = 196_608;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 60 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_AGENT = 'BeerTrackerLinkPreview/1.0';

interface CachedPreview {
  expiresAt: number;
  preview: LinkPreview;
}

interface ResolveLinkPreviewDeps {
  fetchImpl?: typeof fetch;
  lookupAll?: (hostname: string) => Promise<string[]>;
  now?: () => number;
}

const previewCache = new Map<string, CachedPreview>();

export function resetLinkPreviewCache(): void {
  previewCache.clear();
}

export async function resolveLinkPreview(
  rawUrl: string,
  deps: ResolveLinkPreviewDeps = {}
): Promise<LinkPreview> {
  const inspected = inspectLinkPreviewTarget(rawUrl);
  if (!inspected.ok) {
    return createFallbackLinkPreview(rawUrl);
  }
  const cacheKey = normalizePreviewCacheKey(inspected.url);
  const now = deps.now ?? Date.now;
  const cached = previewCache.get(cacheKey);
  if (cached && cached.expiresAt > now()) {
    return cached.preview;
  }
  const preview = await loadLinkPreviewFromNetwork(inspected.url, deps);
  const ttl = preview.title === preview.hostname ? FAILURE_CACHE_TTL_MS : CACHE_TTL_MS;
  previewCache.set(cacheKey, { expiresAt: now() + ttl, preview });
  return preview;
}

async function loadLinkPreviewFromNetwork(
  startUrl: URL,
  deps: ResolveLinkPreviewDeps
): Promise<LinkPreview> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const lookupAll = deps.lookupAll ?? lookupAllAddresses;
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  try {
    const response = await fetchPublicHtml(startUrl, fetchImpl, lookupAll, signal, 0);
    if (!response) {
      return buildHostnamePreview(startUrl);
    }
    const html = await readResponseTextLimited(response, MAX_HTML_BYTES);
    const parsed = parseLinkPreviewHtml(html, new URL(response.url || startUrl.href));
    const hostname = resolveStickyNoteLinkHostname(startUrl.href);
    const rawTitle = parsed.title || hostname;
    return {
      faviconUrl: parsed.faviconHref ?? resolveStickyNoteFaviconUrl(startUrl.href),
      hostname,
      title: resolveStickyNoteLinkBadgeTitle(startUrl.href, rawTitle),
      url: startUrl.href,
    };
  } catch {
    return buildHostnamePreview(startUrl);
  }
}

async function fetchPublicHtml(
  url: URL,
  fetchImpl: typeof fetch,
  lookupAll: (hostname: string) => Promise<string[]>,
  signal: AbortSignal,
  redirectCount: number
): Promise<Response | null> {
  const inspected = inspectLinkPreviewTarget(url.href);
  if (!inspected.ok) {
    return null;
  }
  const addresses = await lookupAll(inspected.url.hostname);
  if (addresses.length === 0 || hasBlockedResolvedAddress(addresses)) {
    return null;
  }
  const response = await fetchImpl(inspected.url.href, {
    cache: 'no-store',
    headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': USER_AGENT },
    method: 'GET',
    redirect: 'manual',
    signal,
  });
  if (isRedirectResponse(response)) {
    return followHtmlRedirect(response, inspected.url, fetchImpl, lookupAll, signal, redirectCount);
  }
  if (!response.ok || !isHtmlContentType(response.headers.get('content-type'))) {
    return null;
  }
  return response;
}

function followHtmlRedirect(
  response: Response,
  currentUrl: URL,
  fetchImpl: typeof fetch,
  lookupAll: (hostname: string) => Promise<string[]>,
  signal: AbortSignal,
  redirectCount: number
): Promise<Response | null> {
  if (redirectCount >= MAX_REDIRECTS) {
    return Promise.resolve(null);
  }
  const location = response.headers.get('location');
  if (!location) {
    return Promise.resolve(null);
  }
  try {
    const nextUrl = new URL(location, currentUrl);
    return fetchPublicHtml(nextUrl, fetchImpl, lookupAll, signal, redirectCount + 1);
  } catch {
    return Promise.resolve(null);
  }
}

function isRedirectResponse(response: Response): boolean {
  return response.status >= 300 && response.status < 400;
}

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) {
    return true;
  }
  const lowered = contentType.toLowerCase();
  return lowered.includes('text/html') || lowered.includes('application/xhtml+xml');
}

async function readResponseTextLimited(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }
    const remaining = maxBytes - received;
    if (value.byteLength >= remaining) {
      chunks.push(value.slice(0, remaining));
      await reader.cancel();
      break;
    }
    chunks.push(value);
    received += value.byteLength;
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(merged);
}

async function lookupAllAddresses(hostname: string): Promise<string[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((item) => item.address);
}

function buildHostnamePreview(url: URL): LinkPreview {
  const fallback = createFallbackLinkPreview(url.href);
  return {
    ...fallback,
    faviconUrl: resolveStickyNoteFaviconUrl(url.href),
  };
}

function normalizePreviewCacheKey(url: URL): string {
  const copy = new URL(url.href);
  copy.hash = '';
  copy.hostname = copy.hostname.toLowerCase();
  return copy.href;
}
