/**
 * Западный (тропический) зодиак по месяцу и дню рождения.
 * id совпадают с полем signs[].id в API deployhoroscope.ru.
 */
export type WesternZodiacId =
  | 'aquarius'
  | 'aries'
  | 'cancer'
  | 'capricorn'
  | 'gemini'
  | 'leo'
  | 'libra'
  | 'pisces'
  | 'sagittarius'
  | 'scorpio'
  | 'taurus'
  | 'virgo';

function parseIsoDateParts(iso: string): { day: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { day, month };
}

const WESTERN_ZODIAC_ORDER: WesternZodiacId[] = [
  'capricorn',
  'aquarius',
  'pisces',
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
];

const westernZodiacMatch: Record<WesternZodiacId, (month: number, day: number) => boolean> = {
  aquarius: (month, day) => (month === 1 && day >= 20) || (month === 2 && day <= 18),
  aries: (month, day) => (month === 3 && day >= 21) || (month === 4 && day <= 19),
  cancer: (month, day) => (month === 6 && day >= 21) || (month === 7 && day <= 22),
  capricorn: (month, day) => (month === 12 && day >= 22) || (month === 1 && day <= 19),
  gemini: (month, day) => (month === 5 && day >= 21) || (month === 6 && day <= 20),
  leo: (month, day) => (month === 7 && day >= 23) || (month === 8 && day <= 22),
  libra: (month, day) => (month === 9 && day >= 23) || (month === 10 && day <= 22),
  pisces: (month, day) => (month === 2 && day >= 19) || (month === 3 && day <= 20),
  sagittarius: (month, day) => (month === 11 && day >= 22) || (month === 12 && day <= 21),
  scorpio: (month, day) => (month === 10 && day >= 23) || (month === 11 && day <= 21),
  taurus: (month, day) => (month === 4 && day >= 20) || (month === 5 && day <= 20),
  virgo: (month, day) => (month === 8 && day >= 23) || (month === 9 && day <= 22),
};

/** id знака для гороскопа релизов или null, если дата невалидна. */
export function getWesternZodiacIdFromIsoBirthdate(
  isoDate: string | null | undefined
): WesternZodiacId | null {
  if (isoDate == null || isoDate === '') return null;
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return null;
  for (const id of WESTERN_ZODIAC_ORDER) {
    if (westernZodiacMatch[id](parts.month, parts.day)) return id;
  }
  return null;
}
