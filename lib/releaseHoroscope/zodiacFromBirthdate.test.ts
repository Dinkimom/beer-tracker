import { describe, expect, it } from 'vitest';

import { getWesternZodiacIdFromIsoBirthdate } from './zodiacFromBirthdate';

describe('getWesternZodiacIdFromIsoBirthdate', () => {
  it('maps cusp dates onto deployhoroscope sign ids', () => {
    expect(getWesternZodiacIdFromIsoBirthdate('1990-01-19')).toBe('capricorn');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-01-20')).toBe('aquarius');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-02-18')).toBe('aquarius');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-02-19')).toBe('pisces');
    expect(getWesternZodiacIdFromIsoBirthdate('2024-02-29')).toBe('pisces');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-03-20')).toBe('pisces');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-03-21')).toBe('aries');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-12-21')).toBe('sagittarius');
    expect(getWesternZodiacIdFromIsoBirthdate('1990-12-22')).toBe('capricorn');
  });

  it('rejects empty and impossible dates', () => {
    expect(getWesternZodiacIdFromIsoBirthdate(null)).toBeNull();
    expect(getWesternZodiacIdFromIsoBirthdate('')).toBeNull();
    expect(getWesternZodiacIdFromIsoBirthdate('1990/01/20')).toBeNull();
    expect(getWesternZodiacIdFromIsoBirthdate('2023-02-29')).toBeNull();
  });
});
