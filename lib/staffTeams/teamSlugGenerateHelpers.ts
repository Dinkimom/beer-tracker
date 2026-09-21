import { CYRILLIC_TO_LATIN } from './teamSlugGenerateConstants';

export function appendTeamSlugChar(acc: string, ch: string): string {
  if (/[a-z0-9]/i.test(ch)) {
    return acc + ch.toLowerCase();
  }
  if (CYRILLIC_TO_LATIN[ch.toLowerCase()] !== undefined || /[а-яё]/i.test(ch)) {
    return acc + transliterateChar(ch);
  }
  if (ch === '_' || ch === '-' || /\s/.test(ch)) {
    return `${acc  }-`;
  }
  return acc;
}

function transliterateChar(ch: string): string {
  const lower = ch.toLowerCase();
  const mapped = CYRILLIC_TO_LATIN[lower];
  if (mapped !== undefined) {
    return mapped;
  }
  return ch;
}

export function collapseTeamSlug(raw: string): string {
  return raw
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}
