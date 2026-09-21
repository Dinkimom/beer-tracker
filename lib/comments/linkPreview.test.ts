import { afterEach, describe, expect, it } from 'vitest';

import { resetLinkPreviewCache, resolveLinkPreview } from './linkPreview';

function dotted(...octets: number[]): string {
  return octets.join('.');
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200,
  });
}

const PUBLIC_LOOKUP = () => Promise.resolve([dotted(93, 184, 216, 34)]);

describe('resolveLinkPreview', () => {
  afterEach(() => {
    resetLinkPreviewCache();
  });

  it('reads title and favicon from html', async () => {
    const preview = await resolveLinkPreview('https://example.com/page', {
      fetchImpl: () =>
        Promise.resolve(
          htmlResponse(
            '<html><head><title>Example Docs</title><link rel="icon" href="/icon.png"></head></html>'
          )
        ),
      lookupAll: PUBLIC_LOOKUP,
    });
    expect(preview).toEqual({
      faviconUrl: 'https://example.com/icon.png',
      hostname: 'example.com',
      title: 'Example Docs',
      url: 'https://example.com/page',
    });
  });

  it('falls back to the url path when dns resolves to a private address', async () => {
    const preview = await resolveLinkPreview('https://example.com/secret', {
      fetchImpl: () => Promise.reject(new Error('should not fetch')),
      lookupAll: () => Promise.resolve([dotted(10, 0, 0, 8)]),
    });
    expect(preview.title).toBe('secret');
    expect(preview.faviconUrl).toContain('google.com/s2/favicons');
  });

  it('does not follow a redirect to a blocked host', async () => {
    const preview = await resolveLinkPreview('https://example.com/go', {
      fetchImpl: () =>
        Promise.resolve(
          new Response(null, {
            headers: { Location: 'https://localhost/internal' },
            status: 302,
          })
        ),
      lookupAll: PUBLIC_LOOKUP,
    });
    expect(preview.title).toBe('go');
  });

  it('keeps the tracker issue key when html title is the product name', async () => {
    const preview = await resolveLinkPreview('https://tracker.yandex.ru/FRONTEND-456', {
      fetchImpl: () => Promise.resolve(htmlResponse('<title>Яндекс Трекер</title>')),
      lookupAll: PUBLIC_LOOKUP,
    });
    expect(preview.title).toBe('FRONTEND-456');
  });
});
