import { describe, expect, it } from 'vitest';

import { generateTeamSlugFromTitle } from './teamSlugGenerate';

describe('generateTeamSlugFromTitle', () => {
  it('transliterates cyrillic and collapses separators', () => {
    expect(generateTeamSlugFromTitle('Команда Бэкенда')).toBe('komanda-bekenda');
  });

  it('keeps latin and digits', () => {
    expect(generateTeamSlugFromTitle('Team 42')).toBe('team-42');
  });

  it('returns team for empty input', () => {
    expect(generateTeamSlugFromTitle('')).toBe('team');
    expect(generateTeamSlugFromTitle('   ')).toBe('team');
  });
});
