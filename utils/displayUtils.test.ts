import { describe, expect, it } from 'vitest';

import { getDisplayShortName, getInitials } from './displayUtils';

describe('getInitials', () => {
  it('uses the first letters of two words', () => {
    expect(getInitials('Иван Петров')).toBe('ИП');
  });
});

describe('getDisplayShortName', () => {
  it('keeps a single word', () => {
    expect(getDisplayShortName('Егор')).toBe('Егор');
  });

  it('uses the given name and surname initial', () => {
    expect(getDisplayShortName('Мария Смирнова')).toBe('Мария С.');
  });

  it('uses the last token when there is a patronymic', () => {
    expect(getDisplayShortName('Иван Иванович Петров')).toBe('Иван П.');
  });

  it('trims extra spaces', () => {
    expect(getDisplayShortName('  Анна  Сергеева ')).toBe('Анна С.');
  });
});
