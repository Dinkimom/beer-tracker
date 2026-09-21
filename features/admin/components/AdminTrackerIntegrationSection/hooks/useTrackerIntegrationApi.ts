import type { TrackerConfigShape, TrackerStatusRowMeta } from "../types";
import type { Dispatch, SetStateAction } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/contexts/LanguageContext";
import { resetPlannerPaletteQueryCaches } from "@/features/task/hooks/useTasks";
import {
  fetchAdminTrackerIntegration,
  fetchAdminTrackerMetadataAll,
  fetchAdminTrackerPlatformFieldValues,
  saveAdminTrackerIntegration,
} from "@/lib/api/admin/tracker";
import { readApiErrorMessage } from "@/lib/api/readApiError";

import { parseTrackerStatusRowsMeta } from "./useTrackerIntegrationApiHelpers";

interface TrackerMetadataFieldRow {
  display?: string;
  id: string;
  key?: string;
  name?: string;
  options?: string[];
  schemaType?: string;
}

export function useTrackerIntegrationLoadSave(options: {
  applyLoadedConfig: (cfg: TrackerConfigShape | undefined) => void;
  onAfterIntegrationLoad?: () => void;
  onSaveSuccess?: (data: {
    config?: { configRevision?: number };
  }) => void;
  organizationId: string;
}) {
  const {
    applyLoadedConfig,
    onAfterIntegrationLoad,
    onSaveSuccess,
    organizationId,
  } = options;
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onAfterIntegrationLoadRef = useRef(onAfterIntegrationLoad);
  onAfterIntegrationLoadRef.current = onAfterIntegrationLoad;
  const onSaveSuccessRef = useRef(onSaveSuccess);
  onSaveSuccessRef.current = onSaveSuccess;

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await fetchAdminTrackerIntegration(organizationId);
      applyLoadedConfig(data.config);
      onAfterIntegrationLoadRef.current?.();
    } catch (error) {
      toast.error(readApiErrorMessage(error, t("admin.plannerIntegration.loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [applyLoadedConfig, organizationId, t]);

  const saveTrackerIntegration = useCallback(
    async (draftConfig: TrackerConfigShape) => {
      if (!organizationId) return;
      setSaving(true);
      try {
        const data = await saveAdminTrackerIntegration(organizationId, draftConfig);
        onSaveSuccessRef.current?.(data);
        toast.success(t("admin.plannerIntegration.saved"));
        resetPlannerPaletteQueryCaches(queryClient, organizationId);
        await load();
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.plannerIntegration.saveFailed")));
      } finally {
        setSaving(false);
      }
    },
    [load, organizationId, queryClient, t],
  );

  return {
    load,
    loading,
    saveTrackerIntegration,
    saving,
  };
}

export function useTrackerMetadataLoad(options: {
  organizationId: string;
  setFieldRows: Dispatch<SetStateAction<TrackerMetadataFieldRow[]>>;
  setTrackerStatusesList: Dispatch<SetStateAction<TrackerStatusRowMeta[]>>;
}) {
  const { organizationId, setFieldRows, setTrackerStatusesList } = options;
  const { language, t } = useI18n();
  const sortLocale = language === "ru" ? "ru" : "en";
  const [metaLoading, setMetaLoading] = useState(false);

  const loadMetadata = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!organizationId) return;
      setMetaLoading(true);
      try {
        const data = await fetchAdminTrackerMetadataAll(organizationId);
        const fields = data.fields ?? [];
        const statuses = (data.statuses ?? []) as Array<{
          display?: string;
          key?: string;
          statusType?: { key?: string };
        }>;
        setFieldRows(fields);
        const statusRowsMeta = parseTrackerStatusRowsMeta(statuses);
        statusRowsMeta.sort((a, b) =>
          a.key.localeCompare(b.key, sortLocale),
        );
        setTrackerStatusesList(statusRowsMeta);
        if (!opts?.silent) {
          toast.success(
            t("admin.plannerIntegration.loadMetaSuccess", {
              fields: fields.length,
              statuses: statuses.length,
            }),
          );
        }
      } catch (error) {
        toast.error(readApiErrorMessage(error, t("admin.plannerIntegration.loadMetaFailed")));
      } finally {
        setMetaLoading(false);
      }
    },
    [organizationId, setFieldRows, setTrackerStatusesList, sortLocale, t],
  );

  return { loadMetadata, metaLoading };
}

export function useTrackerPlatformFieldValues(
  organizationId: string,
  platformFieldId: string,
) {
  const trimmedFieldId = platformFieldId.trim();
  const fetchEnabled = Boolean(organizationId && trimmedFieldId);
  const [platformFieldValues, setPlatformFieldValues] = useState<string[]>([]);

  useEffect(() => {
    if (!fetchEnabled) {
      return;
    }
    let cancelled = false;

    async function loadPlatformFieldValues() {
      const values = await fetchAdminTrackerPlatformFieldValues(organizationId, trimmedFieldId);
      if (!cancelled) {
        setPlatformFieldValues(values);
      }
    }

    void loadPlatformFieldValues();
    return () => {
      cancelled = true;
    };
  }, [fetchEnabled, organizationId, trimmedFieldId]);

  return fetchEnabled ? platformFieldValues : [];
}
