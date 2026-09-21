import { describe, expect, it } from 'vitest';

import {
  getRoleBySlug,
  roleCatalogEntriesToResolutionSlices,
  type RoleCatalogEntry,
  type RoleResolutionSlice,
} from './catalog';

/** Соответствует сиду system_roles (миграция 015). */
const SYSTEM_SLICES: RoleResolutionSlice[] = [
  { slug: 'frontend', title: 'Фронтенд', domainRole: 'developer', platforms: ['web'] },
  { slug: 'backend', title: 'Бэкенд', domainRole: 'developer', platforms: ['back'] },
  { slug: 'qa', title: 'QA', domainRole: 'tester', platforms: [] },
  { slug: 'teamlead', title: 'Тимлид', domainRole: 'developer', platforms: ['web', 'back'] },
];

describe('getRoleBySlug — системные роли (слайсы из БД)', () => {
  it('frontend → developer + web', () => {
    const r = getRoleBySlug('frontend', SYSTEM_SLICES);
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web']);
    expect(r.title).toBe('Фронтенд');
  });

  it('backend → developer + back', () => {
    const r = getRoleBySlug('backend', SYSTEM_SLICES);
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['back']);
    expect(r.title).toBe('Бэкенд');
  });

  it('qa → tester + нет платформ', () => {
    const r = getRoleBySlug('qa', SYSTEM_SLICES);
    expect(r.domainRole).toBe('tester');
    expect(r.platforms).toEqual([]);
    expect(r.title).toBe('QA');
  });

  it('teamlead → developer + web + back', () => {
    const r = getRoleBySlug('teamlead', SYSTEM_SLICES);
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web', 'back']);
    expect(r.title).toBe('Тимлид');
  });

  it('регистронезависимый поиск: FRONTEND → frontend', () => {
    const r = getRoleBySlug('FRONTEND', SYSTEM_SLICES);
    expect(r.domainRole).toBe('developer');
  });
});

describe('getRoleBySlug — приоритет org над system', () => {
  it('одинаковый slug: берётся org, не системная строка', () => {
    const system: RoleResolutionSlice[] = [
      { slug: 'frontend', title: 'Системный фронт', domainRole: 'developer', platforms: ['web'] },
    ];
    const org: RoleResolutionSlice[] = [
      { slug: 'frontend', title: 'Кастом', domainRole: 'tester', platforms: [] },
    ];
    const r = getRoleBySlug('frontend', system, org);
    expect(r.domainRole).toBe('tester');
    expect(r.title).toBe('Кастом');
    expect(r.platforms).toEqual([]);
  });
});

describe('getRoleBySlug — legacy slug', () => {
  it('frontend-angular → developer + web', () => {
    const r = getRoleBySlug('frontend-angular');
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web']);
  });

  it('frontend-vue → developer + web', () => {
    const r = getRoleBySlug('frontend-vue');
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web']);
  });

  it('mobile → developer + web + back', () => {
    const r = getRoleBySlug('mobile');
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web', 'back']);
  });

  it('devops → developer + web + back', () => {
    const r = getRoleBySlug('devops');
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web', 'back']);
  });

  it('swe → developer + web + back', () => {
    const r = getRoleBySlug('swe');
    expect(r.domainRole).toBe('developer');
    expect(r.platforms).toEqual(['web', 'back']);
  });

  it('testops → tester + нет платформ', () => {
    const r = getRoleBySlug('testops');
    expect(r.domainRole).toBe('tester');
    expect(r.platforms).toEqual([]);
  });
});

describe('getRoleBySlug — без слайсов (только legacy / unknown)', () => {
  it('системный slug без БД → unknown (title = slug)', () => {
    const r = getRoleBySlug('frontend');
    expect(r.domainRole).toBe('other');
    expect(r.platforms).toEqual([]);
    expect(r.title).toBe('frontend');
  });
});

describe('getRoleBySlug — граничные случаи', () => {
  it('null → other + пустые платформы', () => {
    const r = getRoleBySlug(null);
    expect(r.domainRole).toBe('other');
    expect(r.platforms).toEqual([]);
    expect(r.title).toBe('');
  });

  it('undefined → other + пустые платформы', () => {
    const r = getRoleBySlug(undefined);
    expect(r.domainRole).toBe('other');
    expect(r.platforms).toEqual([]);
    expect(r.title).toBe('');
  });

  it('пустая строка → other', () => {
    const r = getRoleBySlug('');
    expect(r.domainRole).toBe('other');
  });

  it('неизвестный slug → other + title равен slug', () => {
    const r = getRoleBySlug('some-unknown-role');
    expect(r.domainRole).toBe('other');
    expect(r.platforms).toEqual([]);
    expect(r.title).toBe('some-unknown-role');
  });
});

describe('roleCatalogEntriesToResolutionSlices', () => {
  it('делит по isSystem', () => {
    const entries: RoleCatalogEntry[] = [
      {
        slug: 'a',
        title: 'A',
        domainRole: 'developer',
        platforms: [],
        isSystem: true,
      },
      {
        slug: 'b',
        title: 'B',
        domainRole: 'other',
        platforms: [],
        isSystem: false,
      },
    ];
    const { systemRoles, orgRoles } = roleCatalogEntriesToResolutionSlices(entries);
    expect(systemRoles).toHaveLength(1);
    expect(systemRoles[0]?.slug).toBe('a');
    expect(orgRoles).toHaveLength(1);
    expect(orgRoles[0]?.slug).toBe('b');
  });
});
