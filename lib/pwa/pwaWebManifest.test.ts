import { describe, expect, it } from 'vitest';

import {
  buildPwaManifestLinkHref,
  buildPwaWebManifest,
  resolvePwaManifestStartUrl,
  sanitizePwaStartUrl,
} from './pwaWebManifest';

describe('sanitizePwaStartUrl', () => {
  it('accepts same-origin path and query', () => {
    expect(sanitizePwaStartUrl('/planner/1/sprint/2?tab=board')).toBe(
      '/planner/1/sprint/2?tab=board'
    );
  });

  it('rejects open redirects and protocol-relative URLs', () => {
    expect(sanitizePwaStartUrl('https://evil.example/')).toBeNull();
    expect(sanitizePwaStartUrl('//evil.example/')).toBeNull();
    expect(sanitizePwaStartUrl('/\\evil')).toBeNull();
  });
});

describe('buildPwaManifestLinkHref', () => {
  it('omits the query for the default start url', () => {
    expect(buildPwaManifestLinkHref('/')).toBe('/site.webmanifest');
  });

  it('passes a deep link through to the manifest request', () => {
    expect(buildPwaManifestLinkHref('/planner/1/sprint/2?tab=board')).toBe(
      '/site.webmanifest?start=%2Fplanner%2F1%2Fsprint%2F2%3Ftab%3Dboard'
    );
  });
});

describe('resolvePwaManifestStartUrl', () => {
  it('prefers an explicit start query', () => {
    expect(
      resolvePwaManifestStartUrl({
        explicitStart: '/planner/9/sprint/8?focusTask=a',
        manifestRequestUrl: 'https://beer-tracker.example/site.webmanifest',
        referer: 'https://beer-tracker.example/',
      })
    ).toBe('/planner/9/sprint/8?focusTask=a');
  });

  it('falls back to same-origin referer path', () => {
    expect(
      resolvePwaManifestStartUrl({
        explicitStart: null,
        manifestRequestUrl: 'https://beer-tracker.example/site.webmanifest',
        referer: 'https://beer-tracker.example/planner/1/sprint/2?tab=board',
      })
    ).toBe('/planner/1/sprint/2?tab=board');
  });

  it('ignores a cross-origin referer', () => {
    expect(
      resolvePwaManifestStartUrl({
        explicitStart: null,
        manifestRequestUrl: 'https://beer-tracker.example/site.webmanifest',
        referer: 'https://evil.example/planner/1/sprint/2',
      })
    ).toBe('/');
  });
});

describe('buildPwaWebManifest', () => {
  it('keeps a stable id while start_url follows the current page', () => {
    const manifest = buildPwaWebManifest('/planner/1/sprint/2?tab=board');
    expect(manifest.id).toBe('beer-tracker');
    expect(manifest.start_url).toBe('/planner/1/sprint/2?tab=board');
    expect(manifest.scope).toBe('/');
  });
});
