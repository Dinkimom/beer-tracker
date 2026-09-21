import type { DomainRole, Platform, RoleCatalogEntry } from "@/lib/roles/catalog";
import type { FormEvent } from "react";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/contexts/LanguageContext";
import {
  createAdminOrgRole,
  deleteAdminOrgRole,
  patchAdminOrgRole,
} from "@/lib/api/admin/roles";
import { readApiErrorMessage } from "@/lib/api/readApiError";

import { sortOrgRoles } from "../rolesPageConstants";

interface UseAdminOrgRolesParams {
  organizationId: string;
  roles: RoleCatalogEntry[];
}

export function useAdminOrgRoles({ organizationId, roles }: UseAdminOrgRolesParams) {
  const { language, t } = useI18n();
  const orgFromProps = useMemo(
    () => roles.slice().sort((a, b) => sortOrgRoles(a, b, language)),
    [language, roles],
  );

  const [orgRoles, setOrgRoles] = useState<RoleCatalogEntry[]>(orgFromProps);
  useEffect(() => {
    setOrgRoles(orgFromProps);
  }, [orgFromProps]);

  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);
  const [newDomainRole, setNewDomainRole] = useState<DomainRole>("developer");
  const [newPlatforms, setNewPlatforms] = useState<Platform[]>([]);
  const [createBusy, setCreateBusy] = useState(false);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDomainRole, setEditDomainRole] = useState<DomainRole>("developer");
  const [editPlatforms, setEditPlatforms] = useState<Platform[]>([]);
  const [editBusy, setEditBusy] = useState(false);

  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const beginEdit = useCallback((r: RoleCatalogEntry) => {
    setEditingSlug(r.slug);
    setEditTitle(r.title);
    setEditDomainRole(r.domainRole);
    setEditPlatforms([...r.platforms]);
    setDeletingSlug(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingSlug(null);
  }, []);

  const toggleNewPlatform = useCallback((p: Platform) => {
    if (newDomainRole !== "developer") return;
    setNewPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }, [newDomainRole]);

  const toggleEditPlatform = useCallback((p: Platform) => {
    if (editDomainRole !== "developer") return;
    setEditPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }, [editDomainRole]);

  const setNewDomainRoleSafe = useCallback((v: DomainRole) => {
    setNewDomainRole(v);
    if (v !== "developer") setNewPlatforms([]);
  }, []);

  const setEditDomainRoleSafe = useCallback((v: DomainRole) => {
    setEditDomainRole(v);
    if (v !== "developer") setEditPlatforms([]);
  }, []);

  const submitCreate = useCallback(
    async (e: FormEvent): Promise<boolean> => {
      e.preventDefault();
      const slugNorm = newSlug.trim().toLowerCase();
      const titleTrim = newTitle.trim();
      if (!titleTrim || !slugNorm) {
        toast.error(t("admin.rolesPage.titleAndSlugRequired"));
        return false;
      }
      setCreateBusy(true);
      const optimistic: RoleCatalogEntry = {
        domainRole: newDomainRole,
        isSystem: false,
        platforms: [...newPlatforms],
        slug: slugNorm,
        title: titleTrim,
      };
      const prevList = orgRoles;
      setOrgRoles([...prevList, optimistic].sort((a, b) => sortOrgRoles(a, b, language)));
      try {
        const role = await createAdminOrgRole(organizationId, {
          domainRole: newDomainRole,
          platforms: newPlatforms,
          slug: slugNorm,
          title: titleTrim,
        });
        setOrgRoles((list) => {
          const rest = list.filter((r) => r.slug !== slugNorm);
          return [...rest, role].sort((a, b) => sortOrgRoles(a, b, language));
        });
        toast.success(t("admin.rolesPage.createSuccess"));
        setNewTitle("");
        setNewSlug("");
        setSlugLocked(false);
        setNewDomainRole("developer");
        setNewPlatforms([]);
        return true;
      } catch (error) {
        setOrgRoles(prevList);
        toast.error(readApiErrorMessage(error, t("admin.rolesPage.createFailed")));
        return false;
      } finally {
        setCreateBusy(false);
      }
    },
    [
      language,
      newDomainRole,
      newPlatforms,
      newSlug,
      newTitle,
      orgRoles,
      organizationId,
      t,
    ],
  );

  const submitEdit = useCallback(
    async (slug: string) => {
      setEditBusy(true);
      const prevList = orgRoles;
      setOrgRoles((list) =>
        list
          .map((r) =>
            r.slug === slug
              ? {
                  ...r,
                  domainRole: editDomainRole,
                  platforms: [...editPlatforms],
                  title: editTitle.trim(),
                }
              : r,
          )
          .sort((a, b) => sortOrgRoles(a, b, language)),
      );
      try {
        const role = await patchAdminOrgRole(organizationId, slug, {
          domainRole: editDomainRole,
          platforms: editPlatforms,
          title: editTitle.trim(),
        });
        setOrgRoles((list) =>
          list.map((r) => (r.slug === slug ? role : r)).sort((a, b) => sortOrgRoles(a, b, language)),
        );
        toast.success(t("admin.rolesPage.saveSuccess"));
        setEditingSlug(null);
      } catch (error) {
        setOrgRoles(prevList);
        toast.error(readApiErrorMessage(error, t("admin.rolesPage.saveFailed")));
      } finally {
        setEditBusy(false);
      }
    },
    [editDomainRole, editPlatforms, editTitle, language, orgRoles, organizationId, t],
  );

  const confirmDelete = useCallback(
    async (slug: string) => {
      setDeleteBusy(true);
      const prevList = orgRoles;
      setOrgRoles((list) => list.filter((r) => r.slug !== slug));
      try {
        await deleteAdminOrgRole(organizationId, slug);
        toast.success(t("admin.rolesPage.deleteSuccess"));
        setDeletingSlug(null);
      } catch (error) {
        setOrgRoles(prevList);
        toast.error(readApiErrorMessage(error, t("admin.rolesPage.deleteFailed")));
      } finally {
        setDeleteBusy(false);
      }
    },
    [orgRoles, organizationId, t],
  );

  const startDelete = useCallback((slug: string) => {
    setDeletingSlug(slug);
    setEditingSlug(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeletingSlug(null);
  }, []);

  return {
    beginEdit,
    cancelDelete,
    cancelEdit,
    confirmDelete,
    createBusy,
    deleteBusy,
    deletingSlug,
    editBusy,
    editDomainRole,
    editingSlug,
    editPlatforms,
    editTitle,
    newDomainRole,
    newPlatforms,
    newSlug,
    newTitle,
    orgRoles,
    setEditTitle,
    setNewSlug,
    setNewTitle,
    setSlugLocked,
    slugLocked,
    startDelete,
    submitCreate,
    submitEdit,
    toggleEditPlatform,
    toggleNewPlatform,
    setEditDomainRoleSafe,
    setNewDomainRoleSafe,
  };
}
