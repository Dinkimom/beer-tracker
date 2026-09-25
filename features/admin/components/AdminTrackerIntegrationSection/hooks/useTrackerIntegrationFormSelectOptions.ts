import type { TrackerIntegrationFieldRow } from "./useTrackerIntegrationFormState";
import type { CustomSelectOption } from "@/components/CustomSelect";

import { useMemo } from "react";

import { useI18n } from "@/contexts/LanguageContext";
import {
  filterPlatformMappingRows,
  summarizePlatformMappingRows,
} from "@/lib/trackerIntegration/platformMappingFilter";
import { trackerStatusTypeSectionSortWeight } from "@/lib/trackerIntegration/statusTypeDefaults";

import {
  joinAdminMetaLabels,
  pickPlatformValueMap,
} from "../trackerIntegrationFormModel";
import {
  UNCATEGORIZED,
  type PlatformMappingFilter,
  type PlatformValueMapFormRow,
  type TrackerConfigShape,
  type TrackerStatusRowMeta,
} from "../types";

import { trackerStatusIdentity } from "./useTrackerIntegrationApiHelpers";

export function useTrackerIntegrationFormSelectOptions({
  configBase,
  fieldRows,
  platformFieldValues,
  platformMappingFilter,
  platformValueMap,
  sortLocale,
  statusPaletteByKey,
  trackerStatusesList,
}: {
  configBase: TrackerConfigShape;
  fieldRows: TrackerIntegrationFieldRow[];
  platformFieldValues: string[];
  platformMappingFilter: PlatformMappingFilter;
  platformValueMap: PlatformValueMapFormRow[];
  sortLocale: string;
  statusPaletteByKey: Record<string, string>;
  trackerStatusesList: TrackerStatusRowMeta[];
}) {
  const { t } = useI18n();

  const fieldOptions = useMemo(
    () =>
      fieldRows.map((f) => ({
        id: f.id,
        label: joinAdminMetaLabels([f.display, f.name, f.key], f.id),
      })),
    [fieldRows],
  );

  const releaseReadyStatusOptions = useMemo((): CustomSelectOption<string>[] => {
    const rows = trackerStatusesList
      .slice()
      .sort(
        (a, b) =>
          a.display.localeCompare(b.display, sortLocale) ||
          trackerStatusIdentity(a).localeCompare(trackerStatusIdentity(b), sortLocale),
      );
    return [
      { label: t("admin.plannerIntegration.notSelected"), value: "" },
      ...rows.map((s) => {
        const identity = trackerStatusIdentity(s);
        return {
          label: joinAdminMetaLabels([s.display, s.key], identity),
          value: identity,
        };
      }),
    ];
  }, [sortLocale, t, trackerStatusesList]);

  const numericFieldSelectOptions =
    useMemo((): CustomSelectOption<string>[] => {
      const numericRows = fieldRows.filter((f) => {
        const schema = (f.schemaType ?? "").toLowerCase();
        const key = (f.key ?? "").toLowerCase();
        const id = f.id.toLowerCase();
        if (
          key === "storypoints" ||
          key === "testpoints" ||
          id === "storypoints" ||
          id === "testpoints"
        ) {
          return true;
        }
        return (
          schema === "integer" ||
          schema === "number" ||
          schema === "float" ||
          schema === "double" ||
          schema === "int"
        );
      });
      return [
        { label: t("admin.plannerIntegration.notSelected"), value: "" },
        ...numericRows.map((f) => ({
          label: joinAdminMetaLabels([f.display, f.name, f.key], f.id),
          value: f.id,
        })),
      ];
    }, [fieldRows, t]);

  const allFieldSelectOptions = useMemo((): CustomSelectOption<string>[] => {
    return [
      { label: t("admin.plannerIntegration.notSelected"), value: "" },
      ...fieldRows.map((f) => ({
        label: joinAdminMetaLabels([f.display, f.name, f.key], f.id),
        value: f.id,
      })),
    ];
  }, [fieldRows, t]);

  const statusTableRows = useMemo(() => {
    const knownIdentities = new Set<string>();
    const fromApi = trackerStatusesList.map((row) => {
      const identity = trackerStatusIdentity(row);
      const nameKey = row.key;
      knownIdentities.add(identity);
      knownIdentities.add(nameKey);
      const paletteKey =
        statusPaletteByKey[identity] ??
        (nameKey !== identity ? statusPaletteByKey[nameKey] : undefined) ??
        "";
      return {
        display: row.display,
        key: identity,
        nameKey,
        paletteKey,
        statusTypeKey: row.statusTypeKey,
      };
    });
    const orphans = Object.entries(statusPaletteByKey)
      .filter(([k]) => !knownIdentities.has(k))
      .map(([key, paletteKey]) => ({
        display: key,
        key,
        nameKey: key,
        paletteKey,
        statusTypeKey: undefined as string | undefined,
      }))
      .sort((a, b) => a.key.localeCompare(b.key, sortLocale));
    return [...fromApi, ...orphans];
  }, [sortLocale, statusPaletteByKey, trackerStatusesList]);

  const statusRowsByCategory = useMemo(() => {
    const m = new Map<string, typeof statusTableRows>();
    for (const row of statusTableRows) {
      const id = row.statusTypeKey?.trim() || UNCATEGORIZED;
      if (!m.has(id)) {
        m.set(id, []);
      }
      m.get(id)!.push(row);
    }
    for (const rows of m.values()) {
      rows.sort(
        (a, b) =>
          a.display.localeCompare(b.display, sortLocale) ||
          a.key.localeCompare(b.key, sortLocale) ||
          (a.nameKey ?? "").localeCompare(b.nameKey ?? "", sortLocale),
      );
    }
    const sectionIds = [...m.keys()].sort((a, b) => {
      if (a === UNCATEGORIZED) {
        return 1;
      }
      if (b === UNCATEGORIZED) {
        return -1;
      }
      const byWeight =
        trackerStatusTypeSectionSortWeight(a) -
        trackerStatusTypeSectionSortWeight(b);
      if (byWeight !== 0) {
        return byWeight;
      }
      return a.localeCompare(b, sortLocale);
    });
    return sectionIds.map((id) => ({
      id,
      rows: m.get(id)!,
      title:
        id === UNCATEGORIZED
          ? t("admin.plannerIntegration.category.uncategorized")
          : id,
    }));
  }, [sortLocale, statusTableRows, t]);

  const statusMappingStats = useMemo(() => {
    const total = statusTableRows.length;
    const customColor = statusTableRows.filter((row) => row.paletteKey.trim().length > 0)
      .length;
    const categories = statusRowsByCategory.length;
    return { categories, customColor, total };
  }, [statusRowsByCategory, statusTableRows]);

  const basePlatformValueMap = useMemo(
    () => pickPlatformValueMap(configBase),
    [configBase],
  );

  const platformMappingRows = useMemo(() => {
    const baseByTrackerValue = new Map(
      basePlatformValueMap.map((row) => [row.trackerValue, row.platform]),
    );
    return platformFieldValues.map((trackerValue) => {
      const mapped = platformValueMap.find((x) => x.trackerValue === trackerValue);
      const currentPlatform = mapped?.platform ?? "";
      const basePlatform = baseByTrackerValue.get(trackerValue) ?? "";
      const unmapped = !currentPlatform;
      const changed = currentPlatform !== basePlatform;
      return {
        changed,
        currentPlatform,
        trackerValue,
        unmapped,
      };
    });
  }, [basePlatformValueMap, platformFieldValues, platformValueMap]);

  const visiblePlatformMappingRows = useMemo(
    () => filterPlatformMappingRows(platformMappingRows, platformMappingFilter),
    [platformMappingFilter, platformMappingRows],
  );

  const platformMappingStats = useMemo(
    () => summarizePlatformMappingRows(platformMappingRows),
    [platformMappingRows],
  );

  const fieldSelectOptions = useMemo((): CustomSelectOption<string>[] => {
    return [
      { label: t("admin.plannerIntegration.notSelected"), value: "" },
      ...fieldOptions.map((f) => ({ label: f.label, value: f.id })),
    ];
  }, [fieldOptions, t]);

  return {
    allFieldSelectOptions,
    fieldSelectOptions,
    numericFieldSelectOptions,
    platformMappingStats,
    releaseReadyStatusOptions,
    statusMappingStats,
    statusRowsByCategory,
    statusTableRows,
    visiblePlatformMappingRows,
  };
}
