import { describe, expect, it } from 'vitest';

import { parseLinkPreviewHtml } from './linkPreviewHtml';

const PAGE = new URL('https://example.com/path/page');

describe('parseLinkPreviewHtml', () => {
  it('prefers og:title over the document title', () => {
    const parsed = parseLinkPreviewHtml(
      '<html><head><title>Fallback</title><meta property="og:title" content="Open Graph"></head></html>',
      PAGE
    );
    expect(parsed.title).toBe('Open Graph');
  });

  it('reads twitter:title and decodes entities', () => {
    const parsed = parseLinkPreviewHtml(
      '<meta name="twitter:title" content="Hello &amp; World">',
      PAGE
    );
    expect(parsed.title).toBe('Hello & World');
  });

  it('resolves a relative favicon against the page url', () => {
    const parsed = parseLinkPreviewHtml(
      '<link rel="icon" href="/favicon.png">',
      PAGE
    );
    expect(parsed.faviconHref).toBe('https://example.com/favicon.png');
  });

  it('falls back to apple-touch-icon', () => {
    const parsed = parseLinkPreviewHtml(
      '<link rel="apple-touch-icon" href="https://cdn.example.com/touch.png">',
      PAGE
    );
    expect(parsed.faviconHref).toBe('https://cdn.example.com/touch.png');
  });

  it('returns nulls when the markup has no preview fields', () => {
    expect(parseLinkPreviewHtml('<html><body>hi</body></html>', PAGE)).toEqual({
      faviconHref: null,
      title: null,
    });
  });
});
