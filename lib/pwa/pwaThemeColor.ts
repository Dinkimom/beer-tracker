export const PWA_THEME_COLOR_DARK = '#0f172a';
export const PWA_THEME_COLOR_LIGHT = '#ffffff';

export function resolvePwaThemeColor(isDark: boolean): string {
  return isDark ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT;
}

export function syncDocumentThemeColor(doc: Document, isDark: boolean): void {
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    doc.head.appendChild(meta);
  }
  meta.setAttribute('content', resolvePwaThemeColor(isDark));
}
