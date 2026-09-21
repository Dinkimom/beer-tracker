/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  PWA_THEME_COLOR_DARK,
  PWA_THEME_COLOR_LIGHT,
  resolvePwaThemeColor,
  syncDocumentThemeColor,
} from './pwaThemeColor';

describe('resolvePwaThemeColor', () => {
  it('maps theme to splash / toolbar colors', () => {
    expect(resolvePwaThemeColor(false)).toBe(PWA_THEME_COLOR_LIGHT);
    expect(resolvePwaThemeColor(true)).toBe(PWA_THEME_COLOR_DARK);
  });
});

describe('syncDocumentThemeColor', () => {
  it('creates and updates the theme-color meta tag', () => {
    const doc = document.implementation.createHTMLDocument('');
    syncDocumentThemeColor(doc, false);
    const meta = doc.querySelector('meta[name="theme-color"]');
    expect(meta?.getAttribute('content')).toBe(PWA_THEME_COLOR_LIGHT);
    syncDocumentThemeColor(doc, true);
    expect(doc.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    expect(meta?.getAttribute('content')).toBe(PWA_THEME_COLOR_DARK);
  });
});
