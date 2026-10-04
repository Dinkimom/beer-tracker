import { describe, expect, it } from 'vitest';

import {
  decodeHtmlNumericEntities,
  parseReleaseHoroscopeDay,
  releaseHoroscopeSignName,
} from './releaseHoroscopeDay';

const upstreamSign = {
  comment: 'Звезды говорят, что сегодня благоприятный день для деплоя в прод',
  html: '&#9802;',
  id: 'gemini',
  name_en: 'Gemini',
  name_ru: 'Близнецы',
  status: 'good',
};

describe('decodeHtmlNumericEntities', () => {
  it('turns zodiac numeric entities into symbols', () => {
    expect(decodeHtmlNumericEntities('&#9800;')).toBe('♈');
    expect(decodeHtmlNumericEntities('&#9811;')).toBe('♓');
  });
});

describe('parseReleaseHoroscopeDay', () => {
  it('reads the deployhoroscope.ru day payload', () => {
    const day = parseReleaseHoroscopeDay({
      errors: [],
      result: {
        day: '4',
        month: { id: '10', name_en: 'October', name_ru: 'Октябрь' },
        signs: [upstreamSign, { ...upstreamSign, id: '', status: 'good' }],
        year: '2026',
      },
    });

    expect(day).toEqual({
      day: '4',
      monthId: '10',
      signs: [
        {
          comment: upstreamSign.comment,
          id: 'gemini',
          nameEn: 'Gemini',
          nameRu: 'Близнецы',
          status: 'good',
          symbol: '♊',
        },
      ],
      year: '2026',
    });
  });

  it('reads the normalized API payload and skips unknown statuses', () => {
    const day = parseReleaseHoroscopeDay({
      day: '4',
      monthId: '10',
      signs: [
        {
          comment: 'Hold the release',
          id: 'aries',
          nameEn: 'Aries',
          nameRu: 'Овен',
          status: 'bad',
          symbol: '♈',
        },
        {
          comment: 'Skip me',
          id: 'leo',
          nameEn: 'Leo',
          nameRu: 'Лев',
          status: 'maybe',
          symbol: '♌',
        },
      ],
      year: '2026',
    });

    expect(day?.signs.map((sign) => sign.id)).toEqual(['aries']);
  });

  it('returns null when no sign survives parsing', () => {
    expect(parseReleaseHoroscopeDay({ result: { signs: [] } })).toBeNull();
    expect(parseReleaseHoroscopeDay(null)).toBeNull();
  });
});

describe('releaseHoroscopeSignName', () => {
  it('picks the sign name for the active language', () => {
    const sign = { nameEn: 'Gemini', nameRu: 'Близнецы' };
    expect(releaseHoroscopeSignName(sign, 'ru')).toBe('Близнецы');
    expect(releaseHoroscopeSignName(sign, 'en')).toBe('Gemini');
  });
});
