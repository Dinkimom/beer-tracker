import type { OrgRoleRow } from '@/lib/roles/orgRolesRepository';
import type { SystemRoleRow } from '@/lib/roles/systemRolesRepository';

import { describe, expect, it } from 'vitest';

import {
  getEffectiveRoles,
  orgRoleToEntry,
  systemRoleToEntry,
} from './effectiveCatalog';

const baseDate = new Date('2026-01-01T00:00:00.000Z');

function sys(partial: Partial<SystemRoleRow> & Pick<SystemRoleRow, 'slug' | 'title'>): SystemRoleRow {
  return {
    id: partial.id ?? '00000000-0000-4000-8000-000000000001',
    slug: partial.slug,
    title: partial.title,
    domain_role: partial.domain_role ?? 'developer',
    platforms: partial.platforms ?? ['web'],
    sort_order: partial.sort_order ?? 0,
    created_at: partial.created_at ?? baseDate,
    updated_at: partial.updated_at ?? baseDate,
  };
}

function org(partial: Partial<OrgRoleRow> & Pick<OrgRoleRow, 'slug' | 'title'>): OrgRoleRow {
  return {
    id: partial.id ?? '00000000-0000-4000-8000-000000000002',
    organization_id: partial.organization_id ?? '00000000-0000-4000-8000-000000000099',
    slug: partial.slug,
    title: partial.title,
    domain_role: partial.domain_role ?? 'developer',
    platforms: partial.platforms ?? ['back'],
    created_at: partial.created_at ?? baseDate,
    updated_at: partial.updated_at ?? baseDate,
  };
}

describe('systemRoleToEntry', () => {
  it('ставит isSystem: true и копирует поля', () => {
    const e = systemRoleToEntry(
      sys({ slug: 'frontend', title: 'Фронтенд', domain_role: 'developer', platforms: ['web'] })
    );
    expect(e.isSystem).toBe(true);
    expect(e.slug).toBe('frontend');
    expect(e.title).toBe('Фронтенд');
    expect(e.domainRole).toBe('developer');
    expect(e.platforms).toEqual(['web']);
  });
});

describe('orgRoleToEntry', () => {
  it('ставит isSystem: false', () => {
    const e = orgRoleToEntry(org({ slug: 'custom', title: 'Кастом', domain_role: 'tester' }));
    expect(e.isSystem).toBe(false);
    expect(e.slug).toBe('custom');
    expect(e.domainRole).toBe('tester');
  });
});

describe('getEffectiveRoles', () => {
  it('возвращает пустой массив для пустых входов', () => {
    expect(getEffectiveRoles([], [])).toEqual([]);
  });

  it('сначала все системные, затем org; флаги isSystem корректны', () => {
    const systemRows = [
      sys({ slug: 'b', title: 'B', sort_order: 20 }),
      sys({ slug: 'a', title: 'A', sort_order: 10 }),
    ];
    const orgRows = [org({ slug: 'x', title: 'X' })];
    const merged = getEffectiveRoles(systemRows, orgRows);
    expect(merged).toHaveLength(3);
    expect(merged[0]?.slug).toBe('b');
    expect(merged[0]?.isSystem).toBe(true);
    expect(merged[1]?.slug).toBe('a');
    expect(merged[1]?.isSystem).toBe(true);
    expect(merged[2]?.slug).toBe('x');
    expect(merged[2]?.isSystem).toBe(false);
  });

  it('platforms — копия массива (мутация исходного не меняет entry)', () => {
    const platforms: ('back' | 'web')[] = ['web'];
    const row = sys({ slug: 's', title: 'S', platforms });
    const e = systemRoleToEntry(row);
    platforms.push('back');
    expect(e.platforms).toEqual(['web']);
  });
});
