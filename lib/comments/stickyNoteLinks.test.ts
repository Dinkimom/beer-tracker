import { describe, expect, it } from 'vitest';

import {
  resolveStickyNoteFaviconSources,
  resolveStickyNoteFaviconUrl,
  resolveStickyNoteLinkHostname,
  splitStickyNoteTextByUrls,
} from './stickyNoteLinks';

describe('splitStickyNoteTextByUrls', () => {
  it('keeps plain text as a single segment', () => {
    expect(splitStickyNoteTextByUrls('just a note')).toEqual([
      { type: 'text', value: 'just a note' },
    ]);
  });

  it('extracts http(s) urls and surrounding text', () => {
    expect(splitStickyNoteTextByUrls('see https://example.com/docs later')).toEqual([
      { type: 'text', value: 'see ' },
      { href: 'https://example.com/docs', raw: 'https://example.com/docs', type: 'url' },
      { type: 'text', value: ' later' },
    ]);
  });

  it('treats www. hosts as https links', () => {
    const segments = splitStickyNoteTextByUrls('www.example.com');
    expect(segments).toEqual([
      { href: 'https://www.example.com/', raw: 'www.example.com', type: 'url' },
    ]);
  });

  it('strips trailing punctuation that is not part of the url', () => {
    const segments = splitStickyNoteTextByUrls('Read https://example.com.');
    expect(segments).toEqual([
      { type: 'text', value: 'Read ' },
      { href: 'https://example.com/', raw: 'https://example.com', type: 'url' },
      { type: 'text', value: '.' },
    ]);
  });

  it('keeps balanced closing parentheses inside the url', () => {
    const segments = splitStickyNoteTextByUrls('https://en.wikipedia.org/wiki/Beer_(drink)');
    expect(segments[0]).toMatchObject({
      href: 'https://en.wikipedia.org/wiki/Beer_(drink)',
      type: 'url',
    });
  });

  it('splits multiple urls', () => {
    const segments = splitStickyNoteTextByUrls('a https://a.example b https://b.example');
    expect(segments.filter((segment) => segment.type === 'url')).toHaveLength(2);
  });
});

describe('resolveStickyNoteLinkHostname', () => {
  it('drops a leading www', () => {
    expect(resolveStickyNoteLinkHostname('https://www.github.com/org/repo')).toBe('github.com');
  });
});

describe('resolveStickyNoteFaviconUrl', () => {
  it('uses the google favicon service, not the yandex 1x1 stub', () => {
    expect(resolveStickyNoteFaviconUrl('https://tracker.yandex.ru/FRONTEND-456')).toBe(
      'https://www.google.com/s2/favicons?domain=tracker.yandex.ru&sz=32'
    );
  });
});

describe('resolveStickyNoteFaviconSources', () => {
  it('skips the yandex favicon stub and keeps google then duckduckgo', () => {
    expect(
      resolveStickyNoteFaviconSources(
        'https://tracker.yandex.ru/BT-1',
        'https://favicon.yandex.net/favicon/tracker.yandex.ru'
      )
    ).toEqual([
      'https://www.google.com/s2/favicons?domain=tracker.yandex.ru&sz=32',
      'https://icons.duckduckgo.com/ip3/tracker.yandex.ru.ico',
    ]);
  });

  it('prefers a real icon from the page preview', () => {
    expect(
      resolveStickyNoteFaviconSources('https://example.com/docs', 'https://example.com/icon.png')
    ).toEqual([
      'https://example.com/icon.png',
      'https://www.google.com/s2/favicons?domain=example.com&sz=32',
      'https://icons.duckduckgo.com/ip3/example.com.ico',
    ]);
  });
});
