/**
 * Страны, для которых умеем подсвечивать нерабочие будни.
 * Список — Nager.Date плюс Узбекистан (есть в isdayoff, нет в Nager).
 */
export const HOLIDAY_COUNTRY_CODES = [
  'ad', 'ag', 'ai', 'al', 'am', 'ao', 'ar', 'at', 'au', 'aw', 'ax', 'ba',
  'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bo', 'bq',
  'br', 'bs', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci',
  'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
  'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'er', 'es', 'et',
  'fi', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh',
  'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gt', 'gw', 'gy', 'hk', 'hn',
  'hr', 'ht', 'hu', 'id', 'ie', 'im', 'iq', 'is', 'it', 'je', 'jm', 'jp',
  'ke', 'kh', 'ki', 'km', 'kn', 'kr', 'ky', 'kz', 'lc', 'li', 'lr', 'ls',
  'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk',
  'ml', 'mn', 'mp', 'mq', 'mr', 'ms', 'mt', 'mw', 'mx', 'mz', 'na', 'nc',
  'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'nr', 'nu', 'nz', 'pa', 'pe', 'pf',
  'pg', 'ph', 'pl', 'pm', 'pn', 'pr', 'pt', 'pw', 'py', 'ro', 'rs', 'ru',
  'rw', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm',
  'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tg',
  'tk', 'tn', 'to', 'tr', 'tt', 'tv', 'tz', 'ua', 'ug', 'us', 'uy', 'uz',
  'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'za', 'zm',
  'zw',
] as const;

export type HolidayCountryCode = (typeof HOLIDAY_COUNTRY_CODES)[number];

export const DEFAULT_HOLIDAY_COUNTRY: HolidayCountryCode = 'ru';

const HOLIDAY_COUNTRY_CODE_SET = new Set<string>(HOLIDAY_COUNTRY_CODES);

/** Производственный календарь isdayoff актуален на текущие годы. */
const ISDAYOFF_PREFERRED = new Set<HolidayCountryCode>(['by', 'kz', 'ru', 'uz']);

/** Узбекистана нет в Nager.Date. */
const NAGER_EXCLUDED = new Set<HolidayCountryCode>(['uz']);

export function isHolidayCountryCode(value: string): value is HolidayCountryCode {
  return HOLIDAY_COUNTRY_CODE_SET.has(value);
}

export function normalizeHolidayCountry(value: unknown): HolidayCountryCode {
  if (typeof value !== 'string') {
    return DEFAULT_HOLIDAY_COUNTRY;
  }
  const code = value.toLowerCase();
  return isHolidayCountryCode(code) ? code : DEFAULT_HOLIDAY_COUNTRY;
}

export function prefersIsDayOff(country: HolidayCountryCode): boolean {
  return ISDAYOFF_PREFERRED.has(country);
}

export function hasNagerCalendar(country: HolidayCountryCode): boolean {
  return !NAGER_EXCLUDED.has(country);
}
