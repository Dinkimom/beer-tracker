import type { AppLanguage } from '@/lib/i18n/model';

export type ReleaseSignStatus = 'bad' | 'good' | 'neutral';

interface ReleaseHoroscopeSign {
  comment: string;
  id: string;
  nameEn: string;
  nameRu: string;
  status: ReleaseSignStatus;
  symbol: string;
}

export interface ReleaseHoroscopeDay {
  day: string;
  monthId: string;
  signs: ReleaseHoroscopeSign[];
  year: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** API отдаёт символ знака как числовую сущность, например &#9800;. */
export function decodeHtmlNumericEntities(html: string): string {
  return html.replace(/&#(\d+);/g, (_, code: string) => {
    const point = Number.parseInt(code, 10);
    if (!Number.isFinite(point) || point < 0 || point > 0x10ffff) return '';
    return String.fromCodePoint(point);
  });
}

function isReleaseSignStatus(value: unknown): value is ReleaseSignStatus {
  return value === 'bad' || value === 'good' || value === 'neutral';
}

function readSign(item: unknown): ReleaseHoroscopeSign | null {
  if (!isRecord(item)) return null;
  const id = readString(item.id);
  const nameEn = readString(item.name_en) ?? readString(item.nameEn);
  const nameRu = readString(item.name_ru) ?? readString(item.nameRu);
  const comment = readString(item.comment);
  const rawSymbol = readString(item.html) ?? readString(item.symbol);
  if (!id || !nameEn || !nameRu || !comment || !rawSymbol || !isReleaseSignStatus(item.status)) {
    return null;
  }
  const symbol = decodeHtmlNumericEntities(rawSymbol).trim();
  if (symbol === '') return null;
  return { comment, id, nameEn, nameRu, status: item.status, symbol };
}

function readSigns(value: unknown): ReleaseHoroscopeSign[] {
  if (!Array.isArray(value)) return [];
  const signs: ReleaseHoroscopeSign[] = [];
  for (const item of value) {
    const sign = readSign(item);
    if (sign) signs.push(sign);
  }
  return signs;
}

function readDayRecord(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (Array.isArray(payload.signs)) return payload;
  if (isRecord(payload.result) && Array.isArray(payload.result.signs)) return payload.result;
  return null;
}

function readMonthId(day: Record<string, unknown>): string {
  if (isRecord(day.month)) return readString(day.month.id) ?? '';
  return readString(day.monthId) ?? '';
}

/**
 * Разбирает ответ deployhoroscope.ru (`result.signs`) и нормализованный DTO нашего API.
 */
export function parseReleaseHoroscopeDay(payload: unknown): ReleaseHoroscopeDay | null {
  const day = readDayRecord(payload);
  if (!day) return null;
  const signs = readSigns(day.signs);
  if (signs.length === 0) return null;
  return {
    day: readString(day.day) ?? '',
    monthId: readMonthId(day),
    signs,
    year: readString(day.year) ?? '',
  };
}

export function releaseHoroscopeSignName(
  sign: Pick<ReleaseHoroscopeSign, 'nameEn' | 'nameRu'>,
  language: AppLanguage
): string {
  return language === 'en' ? sign.nameEn : sign.nameRu;
}
