import type { RoleCatalogEntry } from "@/lib/roles/catalog";

import { useI18n } from "@/contexts/LanguageContext";
import { adminListShell, muted } from "@/features/admin/adminUiTokens";

import {
  OrganizationRoleTableRow,
  type OrganizationRoleTableRowProps,
} from "./OrganizationRoleTableRow";

export type OrganizationRolesTableProps = Omit<
  OrganizationRoleTableRowProps,
  "r"
> & {
  orgRoles: RoleCatalogEntry[];
};

export function OrganizationRolesTable({
  orgRoles,
  ...rowProps
}: OrganizationRolesTableProps) {
  const { t } = useI18n();
  if (orgRoles.length === 0) {
    return <p className={muted}>{t("admin.rolesPage.orgTableEmpty")}</p>;
  }

  return (
    <div className="max-h-[60vh] overflow-auto">
      <table className="min-w-full w-full text-sm">
        <caption className="sr-only">{t("admin.rolesPage.orgTableCaption")}</caption>
        <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th
              className="pb-2 pr-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              scope="col"
            >
              {t("admin.rolesPage.colTitle")}
            </th>
            <th
              className="pb-2 pr-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              scope="col"
            >
              {t("admin.rolesPage.colSlug")}
            </th>
            <th
              className="pb-2 pr-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              scope="col"
            >
              {t("admin.rolesPage.colType")}
            </th>
            <th
              className="pb-2 pr-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              scope="col"
            >
              {t("admin.rolesPage.colPlatforms")}
            </th>
            <th
              className="w-px pb-2 pl-4 text-right text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400"
              scope="col"
            >
              {t("admin.rolesPage.colActions")}
            </th>
          </tr>
        </thead>
        <tbody className={adminListShell}>
          {orgRoles.map((r) => (
            <OrganizationRoleTableRow key={r.slug} r={r} {...rowProps} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
