'use client';

import type { RoleCatalogEntry } from "@/lib/roles/catalog";

import { useCallback, useId, useState } from "react";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ModalFormActions } from "@/components/ModalFormActions";
import { useI18n } from "@/contexts/LanguageContext";
import { cardBody, cardHeader, cardShell, hCard } from "@/features/admin/adminUiTokens";

import { CreateOrgRoleForm, type CreateOrgRoleFormProps } from "./CreateOrgRoleForm";
import {
  OrganizationRolesTable,
  type OrganizationRolesTableProps,
} from "./OrganizationRolesTable";

interface AdminOrganizationRolesPanelProps {
  form: Omit<CreateOrgRoleFormProps, "formId"> & { createBusy: boolean };
  hidden: boolean;
  orgRoles: RoleCatalogEntry[];
  table: Omit<OrganizationRolesTableProps, "orgRoles">;
}

export function AdminOrganizationRolesPanel({
  form,
  hidden,
  orgRoles,
  table,
}: AdminOrganizationRolesPanelProps) {
  const { t } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const formId = useId();
  const { createBusy, ...createForm } = form;
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  if (hidden && createOpen) {
    setCreateOpen(false);
  }

  return (
    <div className="space-y-6" hidden={hidden}>
      <section className={cardShell}>
        <div
          className={`${cardHeader} flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6`}
        >
          <h2 className={hCard}>{t("admin.rolesPage.orgPanelTitle")}</h2>
          <Button
            className="shrink-0 px-3.5 py-2"
            type="button"
            variant="primary"
            onClick={() => setCreateOpen(true)}
          >
            <Icon className="h-4 w-4 shrink-0" name="plus" />
            {t("admin.rolesPage.createOpenButton")}
          </Button>
        </div>
        <div className={cardBody}>
          <OrganizationRolesTable orgRoles={orgRoles} {...table} />
        </div>
      </section>

      <Modal
        busy={createBusy}
        className="max-w-lg"
        footer={
          <ModalFormActions
            busy={createBusy}
            busyLabel={t("admin.rolesPage.createBusy")}
            formId={formId}
            submitLabel={t("admin.rolesPage.createSubmit")}
            onCancel={closeCreate}
          />
        }
        open={createOpen}
        title={t("admin.rolesPage.createFormTitle")}
        onClose={closeCreate}
      >
        <CreateOrgRoleForm
          {...createForm}
          formId={formId}
          submitCreate={async (event) => {
            const ok = await form.submitCreate(event);
            if (ok) closeCreate();
            return ok;
          }}
        />
      </Modal>
    </div>
  );
}
