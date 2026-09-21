import { describe, expect, it } from 'vitest';

import {
  resolveStickyNoteLinkBadgeTitle,
  resolveStickyNoteLinkFallbackLabel,
} from './stickyNoteLinkLabel';

describe('resolveStickyNoteLinkFallbackLabel', () => {
  it('uses the tracker issue key from the path', () => {
    expect(resolveStickyNoteLinkFallbackLabel('https://tracker.yandex.ru/FRONTEND-456')).toBe(
      'FRONTEND-456'
    );
    expect(resolveStickyNoteLinkFallbackLabel('https://tracker.yandex.ru/issues/BT-W2-4')).toBe(
      'BT-W2-4'
    );
  });

  it('uses the last meaningful path segments when there is no issue key', () => {
    expect(resolveStickyNoteLinkFallbackLabel('https://github.com/org/repo')).toBe('org/repo');
    expect(
      resolveStickyNoteLinkFallbackLabel('https://en.wikipedia.org/wiki/Beer_(drink)')
    ).toBe('Beer_(drink)');
  });

  it('falls back to the hostname for a site root', () => {
    expect(resolveStickyNoteLinkFallbackLabel('https://www.example.com/')).toBe('example.com');
  });
});

describe('resolveStickyNoteLinkBadgeTitle', () => {
  it('keeps the issue key when the html title is only the product name', () => {
    expect(
      resolveStickyNoteLinkBadgeTitle('https://tracker.yandex.ru/FRONTEND-456', 'Яндекс Трекер')
    ).toBe('FRONTEND-456');
    expect(resolveStickyNoteLinkBadgeTitle('https://tracker.yandex.ru/FRONTEND-456', 'Yandex')).toBe(
      'FRONTEND-456'
    );
  });

  it('prefixes a real page title with the issue key', () => {
    expect(
      resolveStickyNoteLinkBadgeTitle(
        'https://tracker.yandex.ru/FRONTEND-456',
        'Починить логин — Яндекс Трекер'
      )
    ).toBe('FRONTEND-456: Починить логин');
  });

  it('keeps a specific html title that already includes the issue key', () => {
    expect(
      resolveStickyNoteLinkBadgeTitle(
        'https://tracker.yandex.ru/FRONTEND-456',
        'FRONTEND-456: Починить логин'
      )
    ).toBe('FRONTEND-456: Починить логин');
  });

  it('uses a document title when the url is not a tracker issue', () => {
    expect(resolveStickyNoteLinkBadgeTitle('https://example.com/docs', 'Getting started')).toBe(
      'Getting started'
    );
    expect(resolveStickyNoteLinkBadgeTitle('https://example.com/page', 'Example Docs')).toBe(
      'Example Docs'
    );
  });

  it('uses the path when there is no fetched title', () => {
    expect(resolveStickyNoteLinkBadgeTitle('https://example.com/secret')).toBe('secret');
  });
});
