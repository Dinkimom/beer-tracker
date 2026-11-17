import type { DomainRole, Platform } from "@/lib/roles/catalog";
import type { FormEvent } from "react";

import { useMemo } from "react";

import { CustomSelect } from "@/components/CustomSelect";
import { TextTooltip } from "@/components/TextTooltip";
import { useI18n } from "@/contexts/LanguageContext";
import { adminFormCheckbox, field, label } from "@/features/admin/adminUiTokens";
import { toSlug } from "@/lib/roles/toSlug";

import { domainRoleOptions, PLATFORM_VALUES } from "../rolesPageConstants";

export interface CreateOrgRoleFormProps {
  /** id формы: кнопка отправки стоит в подвале окна и ссылается на неё атрибутом `form`. */
  formId: string;
  newDomainRole: DomainRole;
  newPlatforms: Platform[];
  newSlug: string;
  newTitle: string;
  slugLocked: boolean;
  setNewDomainRoleSafe: (v: DomainRole) => void;
  setNewSlug: (v: string) => void;
  setNewTitle: (v: string) => void;
  setSlugLocked: (v: boolean) => void;
  submitCreate: (e: FormEvent) => Promise<boolean>;
  toggleNewPlatform: (p: Platform) => void;
}

export function CreateOrgRoleForm({
  formId,
  newDomainRole,
  newPlatforms,
  newSlug,
  newTitle,
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
    <form className="space-y-4" id={formId} onSubmit={(e) => void submitCreate(e)}>
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
          <TextTooltip content={t("admin.rolesPage.createSlugHint")}>
          <input
            className={field}
            id="role-new-slug"
            placeholder="latin-kebab-case"
            type="text"
            value={newSlug}
            onChange={(e) => {
              setSlugLocked(true);
              setNewSlug(e.target.value);
            }}
          />
          </TextTooltip>
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
    </form>
  );
}
