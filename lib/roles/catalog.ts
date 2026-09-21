/**
 * Резолв ролей по slug: слайсы из БД (system_roles + org_roles) + legacy fallback.
 * Чистый модуль без зависимостей от React, MobX или внешних пакетов.
 */

export type DomainRole = 'developer' | 'other' | 'tester';
export type Platform = 'back' | 'web';

export interface RoleCatalogEntry {
  /** Доменная роль для бизнес-логики планировщика */
  domainRole: DomainRole;
  /** true = встроенная, нельзя удалить через UI */
  isSystem: boolean;
  /** Платформы разработчика (только для domainRole === 'developer') */
  platforms: Platform[];
  /** Уникальный идентификатор; используется в team_members.role_slug */
  slug: string;
  /** Человекочитаемое название */
  title: string;
}

interface ResolvedRole {
  domainRole: DomainRole;
  platforms: Platform[];
  /** Человекочитаемый title; для неизвестного slug — сам slug */
  title: string;
}

/** Минимальные поля для резолва slug → ResolvedRole (из строк БД или merge). */
export type RoleResolutionSlice = Pick<
  RoleCatalogEntry,
  'domainRole' | 'platforms' | 'slug' | 'title'
>;

/**
 * Делит полный каталог (после getEffectiveRoles) на слайсы для getRoleBySlug.
 */
export function roleCatalogEntriesToResolutionSlices(entries: RoleCatalogEntry[]): {
  systemRoles: RoleResolutionSlice[];
  orgRoles: RoleResolutionSlice[];
} {
  const systemRoles: RoleResolutionSlice[] = [];
  const orgRoles: RoleResolutionSlice[] = [];
  for (const e of entries) {
    const slice: RoleResolutionSlice = {
      slug: e.slug,
      domainRole: e.domainRole,
      platforms: e.platforms,
      title: e.title,
    };
    if (e.isSystem) {
      systemRoles.push(slice);
    } else {
      orgRoles.push(slice);
    }
  }
  return { systemRoles, orgRoles };
}

/**
 * Fallback для legacy slug, существовавших до введения каталога.
 * Позволяет старым team_members.role_slug продолжать работать корректно.
 */
const LEGACY_FALLBACK: Record<string, ResolvedRole> = {
  'frontend-angular': { domainRole: 'developer', platforms: ['web'], title: 'Frontend Angular' },
  'frontend-vue': { domainRole: 'developer', platforms: ['web'], title: 'Frontend Vue' },
  mobile: { domainRole: 'developer', platforms: ['web', 'back'], title: 'Mobile' },
  devops: { domainRole: 'developer', platforms: ['web', 'back'], title: 'DevOps' },
  swe: { domainRole: 'developer', platforms: ['web', 'back'], title: 'SWE' },
  testops: { domainRole: 'tester', platforms: [], title: 'TestOps' },
};

const UNKNOWN: ResolvedRole = { domainRole: 'other', platforms: [], title: '' };

function findSliceBySlug(
  slices: RoleResolutionSlice[] | undefined,
  lower: string
): RoleResolutionSlice | undefined {
  if (!slices?.length) return undefined;
  return slices.find((r) => r.slug.toLowerCase() === lower);
}

function sliceToResolved(entry: RoleResolutionSlice): ResolvedRole {
  return {
    domainRole: entry.domainRole,
    platforms: entry.platforms,
    title: entry.title,
  };
}

/**
 * Возвращает ResolvedRole по slug.
 * Порядок: org_roles → system_roles → LEGACY_FALLBACK → unknown (domainRole: 'other', title: slug).
 * Без переданных слайсов системные slug не резолвятся (только legacy и unknown).
 */
export function getRoleBySlug(
  slug: string | null | undefined,
  systemRoles?: RoleResolutionSlice[],
  orgRoles?: RoleResolutionSlice[]
): ResolvedRole {
  if (!slug) return UNKNOWN;
  const lower = slug.toLowerCase();
  const fromOrg = findSliceBySlug(orgRoles, lower);
  if (fromOrg) return sliceToResolved(fromOrg);
  const fromSys = findSliceBySlug(systemRoles, lower);
  if (fromSys) return sliceToResolved(fromSys);
  return LEGACY_FALLBACK[lower] ?? { ...UNKNOWN, title: slug };
}
