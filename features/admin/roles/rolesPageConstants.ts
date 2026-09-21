import type { CustomSelectOption } from "@/components/CustomSelect";
import type { DomainRole, Platform, RoleCatalogEntry } from "@/lib/roles/catalog";

const DOMAIN_ROLE_VALUES: readonly DomainRole[] = ["developer", "tester", "other"];

export const PLATFORM_VALUES: readonly Platform[] = ["web", "back"];

export type RolesTabId = "organization" | "system";

export function formatPlatforms(
  platforms: Platform[],
  t: (key: string) => string,
): string {
  if (platforms.length === 0) return "—";
  return platforms
    .map((p) => t(`admin.rolesPage.platform.${p}`) || p)
    .join(", ");
}

export function sortOrgRoles(
  a: RoleCatalogEntry,
  b: RoleCatalogEntry,
  locale: string,
): number {
  return a.title.localeCompare(b.title, locale, { sensitivity: "base" });
}

export function domainRoleOptions(t: (key: string) => string): CustomSelectOption<DomainRole>[] {
  return DOMAIN_ROLE_VALUES.map((value) => ({
    label: t(`admin.rolesPage.domain.${value}`),
    value,
  }));
}
