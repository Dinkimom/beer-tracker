import type { RoleCatalogEntry } from "@/lib/roles/catalog";

import { useI18n } from "@/contexts/LanguageContext";
import {
  adminListShell,
  badgeMuted,
  cardBody,
  cardHeader,
  cardShell,
  hCard,
  muted,
} from "@/features/admin/adminUiTokens";

import { formatPlatforms } from "../rolesPageConstants";

interface AdminSystemRolesPanelProps {
  hidden: boolean;
  systemRoles: RoleCatalogEntry[];
  titleKey?: string;
}

export function AdminSystemRolesPanel({
  hidden,
  systemRoles,
  titleKey = "admin.rolesPage.systemTitle",
}: AdminSystemRolesPanelProps) {
  const { has, t } = useI18n();

  return (
    <div
      aria-labelledby="roles-tab-system"
      className="space-y-6"
      hidden={hidden}
      id="roles-panel-system"
      role="tabpanel"
    >
      <section className={cardShell}>
        <div className={cardHeader}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <h2 className={hCard}>{t(titleKey)}</h2>
            {systemRoles.length > 0 ? (
              <span className={`${badgeMuted} shrink-0 self-start sm:self-auto`}>
                {t("admin.rolesPage.systemReadonlyBadge")}
              </span>
            ) : null}
          </div>
        </div>
        <div className={cardBody}>
          {systemRoles.length === 0 ? (
            <p className={muted}>{t("admin.rolesPage.systemNotLoaded")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <caption className="sr-only">{t("admin.rolesPage.systemTableCaption")}</caption>
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th
                      className="pb-2 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                      scope="col"
                    >
                      {t("admin.rolesPage.colTitle")}
                    </th>
                    <th
                      className="pb-2 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                      scope="col"
                    >
                      {t("admin.rolesPage.colSlug")}
                    </th>
                    <th
                      className="pb-2 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                      scope="col"
                    >
                      {t("admin.rolesPage.colType")}
                    </th>
                    <th
                      className="pb-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
                      scope="col"
                    >
                      {t("admin.rolesPage.colPlatforms")}
                    </th>
                  </tr>
                </thead>
                <tbody className={adminListShell}>
                  {systemRoles.map((r) => (
                    <tr key={r.slug}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900 dark:text-gray-100">
                        {r.title}
                      </td>
                      <td className="py-2.5 pr-4">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {r.slug}
                        </code>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                        {has(`admin.rolesPage.domain.${r.domainRole}`)
                          ? t(`admin.rolesPage.domain.${r.domainRole}`)
                          : r.domainRole}
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-400">
                        {formatPlatforms(r.platforms, t)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
