const MAX_TITLE_LENGTH = 200;

interface ParsedLinkPreviewHtml {
  faviconHref: string | null;
  title: string | null;
}

export function parseLinkPreviewHtml(html: string, pageUrl: URL): ParsedLinkPreviewHtml {
  const faviconHref = resolvePageFaviconUrl(html, pageUrl);
  const title = resolvePageTitle(html);
  return { faviconHref, title };
}

function resolvePageTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  if (ogTitle) {
    return ogTitle;
  }
  const twitterTitle = extractMetaContent(html, 'name', 'twitter:title');
  if (twitterTitle) {
    return twitterTitle;
  }
  const titleMatch = html.match(/<title[^>]{0,64}>([\s\S]{0,500}?)<\/title>/i);
  return sanitizePreviewTitle(titleMatch?.[1] ?? '');
}

function extractMetaContent(html: string, attrName: string, attrValue: string): string | null {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namedFirst = new RegExp(
    `<meta\\s+[^>]{0,256}${attrName}\\s*=\\s*["']${escaped}["'][^>]{0,256}content\\s*=\\s*["']([^"']{0,500})["'][^>]{0,64}>`,
    'i'
  );
  const contentFirst = new RegExp(
    `<meta\\s+[^>]{0,256}content\\s*=\\s*["']([^"']{0,500})["'][^>]{0,256}${attrName}\\s*=\\s*["']${escaped}["'][^>]{0,64}>`,
    'i'
  );
  const namedMatch = html.match(namedFirst);
  if (namedMatch?.[1]) {
    return sanitizePreviewTitle(namedMatch[1]);
  }
  const contentMatch = html.match(contentFirst);
  return sanitizePreviewTitle(contentMatch?.[1] ?? '');
}

function resolvePageFaviconUrl(html: string, pageUrl: URL): string | null {
  const linkTags = html.match(/<link\b[^>]{0,512}>/gi) ?? [];
  let appleTouch: string | null = null;
  for (const tag of linkTags) {
    const rel = readHtmlAttr(tag, 'rel')?.toLowerCase() ?? '';
    const href = readHtmlAttr(tag, 'href');
    if (!href) {
      continue;
    }
    const tokens = rel.split(/\s+/);
    if (tokens.includes('icon')) {
      return resolveHttpUrl(pageUrl, href);
    }
    if (!appleTouch && tokens.some((token) => token.includes('apple-touch-icon'))) {
      appleTouch = resolveHttpUrl(pageUrl, href);
    }
  }
  return appleTouch;
}

function readHtmlAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1] ?? null;
}

function resolveHttpUrl(base: URL, href: string): string | null {
  try {
    const resolved = new URL(href, base);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

function sanitizePreviewTitle(raw: string): string | null {
  const decoded = decodeHtmlEntities(raw)
    .replace(/<[^>]{0,64}>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!decoded) {
    return null;
  }
  return decoded.slice(0, MAX_TITLE_LENGTH);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => fromCodePoint(Number(dec)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function fromCodePoint(code: number): string {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) {
    return '';
  }
  return String.fromCodePoint(code);
}
