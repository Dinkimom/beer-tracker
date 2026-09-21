import type { DomainRole, Platform } from "@/lib/roles/catalog";
import type { FormEvent } from "react";

import { useMemo } from "react";

import { Button } from "@/components/Button";
import { CustomSelect } from "@/components/CustomSelect";
import { useI18n } from "@/contexts/LanguageContext";
import { adminFormCheckbox, field, label } from "@/features/admin/adminUiTokens";
import { toSlug } from "@/lib/roles/toSlug";

import { domainRoleOptions, PLATFORM_VALUES } from "../rolesPageConstants";

export interface CreateOrgRoleFormProps {
  createBusy: boolean;
  newDomainRole: DomainRole;
  newPlatforms: Platform[];
  newSlug: string;
  newTitle: string;
  slugLocked: boolean;
  onCancel: () => void;
  setNewDomainRoleSafe: (v: DomainRole) => void;
  setNewSlug: (v: string) => void;
  setNewTitle: (v: string) => void;
  setSlugLocked: (v: boolean) => void;
  submitCreate: (e: FormEvent) => Promise<boolean>;
  toggleNewPlatform: (p: Platform) => void;
}

export function CreateOrgRoleForm({
  createBusy,
  newDomainRole,
  newPlatforms,
  newSlug,
  newTitle,
  onCancel,
  setNewDomainRoleSafe,
  setNewSlug,
  setNewTitle,
  setSlugLocked,
  slugLocked,
  submitCreate,
  toggleNewPlatform,
}: CreateOrgRoleFormProps) {
  const { t } = useI18n();
  const domainOptions = useMemo(() => domainRoleOptions(t), [t]);

  return (
    <form className="space-y-4" onSubmit={(e) => void submitCreate(e)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="role-new-title">
            {t("admin.rolesPage.createTitleLabel")}
          </label>
          <input
            autoFocus
            className={field}
            id="role-new-title"
            type="text"
            value={newTitle}
            onChange={(e) => {
              const v = e.target.value;
              setNewTitle(v);
              if (!slugLocked) {
                setNewSlug(toSlug(v));
              }
            }}
          />
        </div>
        <div>
          <label className={label} htmlFor="role-new-slug">
            Slug
          </label>
          <input
            className={field}
            id="role-new-slug"
            placeholder="latin-kebab-case"
            title={t("admin.rolesPage.createSlugHint")}
            type="text"
            value={newSlug}
            onChange={(e) => {
              setSlugLocked(true);
              setNewSlug(e.target.value);
            }}
          />
        </div>
      </div>
      <div>
        <span className={label}>{t("admin.rolesPage.createDomainLabel")}</span>
        <CustomSelect
          className="w-full"
          options={domainOptions}
          selectedPrefix=""
          title={t("admin.rolesPage.roleSelectTitle")}
          value={newDomainRole}
          onChange={setNewDomainRoleSafe}
        />
      </div>
      {newDomainRole === "developer" ? (
        <div>
          <span className={label}>{t("admin.rolesPage.createPlatformsLabel")}</span>
          <div className="mt-2 flex flex-wrap gap-4">
            {PLATFORM_VALUES.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  checked={newPlatforms.includes(p)}
                  className={adminFormCheckbox}
                  type="checkbox"
                  onChange={() => toggleNewPlatform(p)}
                />
                {t(`admin.rolesPage.platform.${p}`)}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={createBusy} type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button disabled={createBusy} type="submit" variant="primary">
          {createBusy ? t("admin.rolesPage.createBusy") : t("admin.rolesPage.createSubmit")}
        </Button>
      </div>
    </form>
  );
}
