const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function isSlugSeparatorChar(ch: string): boolean {
  return ch === '_' || ch === '-' || ch === ' ' || ch === '.' || /\s/.test(ch);
}

export function mapCharToSlugPart(ch: string): string {
  if (/[a-z0-9]/.test(ch)) {
    return ch;
  }
  const mapped = CYRILLIC_TO_LATIN[ch];
  if (mapped !== undefined) {
    return mapped;
  }
  if (isSlugSeparatorChar(ch)) {
    return '-';
  }
  return '-';
}

export function normalizeSlugOutput(raw: string): string {
  return raw.replace(/-+/g, '-').replace(/^-|-$/g, '');
}
