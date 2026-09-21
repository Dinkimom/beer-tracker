import { describe, expect, it } from 'vitest';

import { toSlug } from './toSlug';

describe('toSlug', () => {
  it('транслитерирует кириллицу в kebab-case', () => {
    expect(toSlug('Фронтенд разработчик')).toBe('frontend-razrabotchik');
  });

  it('сохраняет латиницу и цифры', () => {
    expect(toSlug('Team42 Lead')).toBe('team42-lead');
  });

  it('схлопывает повторяющиеся дефисы', () => {
    expect(toSlug('a---b  c')).toBe('a-b-c');
  });

  it('обрезает ведущие и хвостовые дефисы', () => {
    expect(toSlug('  -hello-  ')).toBe('hello');
  });

  it('пустая строка → пустая строка', () => {
    expect(toSlug('')).toBe('');
    expect(toSlug('   ')).toBe('');
  });

  it('подчёркивания и точки → дефис', () => {
    expect(toSlug('foo_bar.baz')).toBe('foo-bar-baz');
  });

  it('смешанный ввод', () => {
    expect(toSlug('QA Ведущий 2024')).toBe('qa-veduschiy-2024');
  });
});
