import type { DomainRole, Platform, RoleCatalogEntry } from "@/lib/roles/catalog";

import { useMemo } from "react";

import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/LanguageContext";

import { domainRoleOptions, formatPlatforms } from "../rolesPageConstants";

import { OrganizationRoleTableRowDeleteConfirm } from "./OrganizationRoleTableRowDeleteConfirm";
import { OrganizationRoleTableRowEdit } from "./OrganizationRoleTableRowEdit";

export interface OrganizationRoleTableRowProps {
  deleteBusy: boolean;
  deletingSlug: string | null;
  editBusy: boolean;
  editDomainRole: DomainRole;
  editingSlug: string | null;
  editPlatforms: Platform[];
  editTitle: string;
  r: RoleCatalogEntry;
  beginEdit: (r: RoleCatalogEntry) => void;
  cancelDelete: () => void;
  cancelEdit: () => void;
  confirmDelete: (slug: string) => Promise<void>;
  setEditDomainRoleSafe: (v: DomainRole) => void;
  setEditTitle: (v: string) => void;
  startDelete: (slug: string) => void;
  submitEdit: (slug: string) => Promise<void>;
  toggleEditPlatform: (p: Platform) => void;
}

export function OrganizationRoleTableRow({
  beginEdit,
  cancelDelete,
  cancelEdit,
  confirmDelete,
  deleteBusy,
  deletingSlug,
  editBusy,
  editDomainRole,
  editingSlug,
  editPlatforms,
  editTitle,
  r,
  setEditDomainRoleSafe,
  setEditTitle,
  startDelete,
  submitEdit,
  toggleEditPlatform,
}: OrganizationRoleTableRowProps) {
  const { has, t } = useI18n();
  const domainOptions = useMemo(() => domainRoleOptions(t), [t]);

  if (editingSlug === r.slug) {
    return (
      <OrganizationRoleTableRowEdit
        cancelEdit={cancelEdit}
        domainOptions={domainOptions}
        editBusy={editBusy}
        editDomainRole={editDomainRole}
        editPlatforms={editPlatforms}
        editTitle={editTitle}
        setEditDomainRoleSafe={setEditDomainRoleSafe}
        setEditTitle={setEditTitle}
        slug={r.slug}
        submitEdit={submitEdit}
        toggleEditPlatform={toggleEditPlatform}
      />
    );
  }

  if (deletingSlug === r.slug) {
    return (
      <OrganizationRoleTableRowDeleteConfirm
        cancelDelete={cancelDelete}
        confirmDelete={confirmDelete}
        deleteBusy={deleteBusy}
        slug={r.slug}
        title={r.title}
      />
    );
  }

  return (
    <tr>
      <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-gray-100">{r.title}</td>
      <td className="py-2.5 pr-3">
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {r.slug}
        </code>
      </td>
      <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
        {has(`admin.rolesPage.domain.${r.domainRole}`)
          ? t(`admin.rolesPage.domain.${r.domainRole}`)
          : r.domainRole}
      </td>
      <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
        {formatPlatforms(r.platforms, t)}
      </td>
      <td className="w-px whitespace-nowrap py-2.5 pl-6 text-right align-middle">
        <div className="flex justify-end gap-2">
          <Button
            aria-label={t("admin.rolesPage.editAria", { title: r.title })}
            className="px-3.5 py-2"
            type="button"
            variant="outline"
            onClick={() => beginEdit(r)}
          >
            {t("admin.rolesPage.edit")}
          </Button>
          <Button
            aria-label={t("admin.rolesPage.deleteAria", { title: r.title })}
            className="px-3.5 py-2"
            type="button"
            variant="dangerOutline"
            onClick={() => startDelete(r.slug)}
          >
            {t("admin.rolesPage.delete")}
          </Button>
        </div>
      </td>
    </tr>
  );
}
