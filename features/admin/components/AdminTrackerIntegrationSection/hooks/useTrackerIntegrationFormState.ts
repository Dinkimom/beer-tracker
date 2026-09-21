import { useCallback, useMemo, useRef, useState } from "react";

import { useI18n } from "@/contexts/LanguageContext";

import {
  cloneConfigWithoutRevision,
  mergeFormIntoConfig,
} from "../trackerIntegrationFormModel";
import {
  type EmbeddedTestingOnlyJoin,
  type EmbeddedTestingOnlyRuleForm,
  type IntegrationSubtabId,
  type PlatformMappingFilter,
  type PlatformValueMapFormRow,
  type TrackerConfigShape,
  type TrackerStatusRowMeta,
} from "../types";

import { useTrackerPlatformFieldValues } from "./useTrackerIntegrationApi";
import { useTrackerIntegrationFormAutoDefaults } from "./useTrackerIntegrationFormAutoDefaults";
import { useTrackerIntegrationFormSelectOptions } from "./useTrackerIntegrationFormSelectOptions";
import {
  formatTestingOnlyRulesPreview,
  hydrateIntegrationFormFromConfig,
  resetIntegrationFormToEmpty,
  resolveIntegrationFooterSummaryText,
} from "./useTrackerIntegrationFormStateHelpers";

export interface TrackerIntegrationFieldRow {
  display?: string;
  id: string;
  key?: string;
  name?: string;
  options?: string[];
  schemaType?: string;
}

interface UseTrackerIntegrationFormStateParams {
  fieldRows: TrackerIntegrationFieldRow[];
  organizationId: string;
  trackerStatusesList: TrackerStatusRowMeta[];
}

export function useTrackerIntegrationFormState({
  fieldRows,
  organizationId,
  trackerStatusesList,
}: UseTrackerIntegrationFormStateParams) {
  const { t, language } = useI18n();
  const sortLocale = language === "ru" ? "ru" : "en";

  const [configBase, setConfigBase] = useState<TrackerConfigShape>({});
  const [revision, setRevision] = useState<number | null>(null);
  const [platformFieldId, setPlatformFieldId] = useState("");
  const [platformValueMap, setPlatformValueMap] = useState<
    PlatformValueMapFormRow[]
  >([]);

  const [minSp, setMinSp] = useState("");
  const [minTp, setMinTp] = useState("");
  const [integrationLoadNonce, setIntegrationLoadNonce] = useState(0);
  const lastReleaseDefaultsForLoadNonceRef = useRef(-1);
  const [releaseReadyStatusKey, setReleaseReadyStatusKey] = useState("");
  const [releaseMrFieldId, setReleaseMrFieldId] = useState("");
  const [devAssigneeFieldId, setDevAssigneeFieldId] = useState("");
  const [devEstimateFieldId, setDevEstimateFieldId] = useState("");
  const [qaEngineerFieldId, setQaEngineerFieldId] = useState("");
  const [qaEstimateFieldId, setQaEstimateFieldId] = useState("");
  const [testingFlowMode, setTestingFlowMode] = useState<
    "embedded" | "standalone"
  >("embedded");
  const [zeroDevPositiveQa, setZeroDevPositiveQa] = useState(false);
  const [embeddedTestingOnlyJoins, setEmbeddedTestingOnlyJoins] = useState<
    EmbeddedTestingOnlyJoin[]
  >([]);
  const [embeddedTestingOnlyRules, setEmbeddedTestingOnlyRules] = useState<
    EmbeddedTestingOnlyRuleForm[]
  >([]);
  const [statusPaletteByKey, setStatusPaletteByKey] = useState<
    Record<string, string>
  >({});

  const platformFieldValues = useTrackerPlatformFieldValues(
    organizationId,
    platformFieldId,
  );

  const [activeSubtab, setActiveSubtab] =
    useState<IntegrationSubtabId>("process-setup");
  const [platformMappingFilter, setPlatformMappingFilter] =
    useState<PlatformMappingFilter>("all");
  const [reloadConfirmArmed, setReloadConfirmArmed] = useState(false);

  const initialIntegrationSnapshotRef = useRef<{
    hadEmbeddedTestingOnlyExtraRules: boolean;
    hadPlatformField: boolean;
    hadPlatformMap: boolean;
  } | null>(null);

  const {
    allFieldSelectOptions,
    fieldSelectOptions,
    mappingFieldSelectOptions,
    numericFieldSelectOptions,
    platformMappingStats,
    releaseReadyStatusOptions,
    statusMappingStats,
    statusRowsByCategory,
    statusTableRows,
    visiblePlatformMappingRows,
  } = useTrackerIntegrationFormSelectOptions({
    configBase,
    fieldRows,
    platformFieldValues,
    platformMappingFilter,
    platformValueMap,
    sortLocale,
    statusPaletteByKey,
    trackerStatusesList,
  });

  const draftConfig = useMemo(
    () =>
      mergeFormIntoConfig(
        { ...configBase },
        {
          devAssigneeFieldId,
          devEstimateFieldId,
          embeddedTestingOnlyJoins,
          embeddedTestingOnlyRules,
          minSp,
          minTp,
          platformFieldId,
          platformValueMap,
          qaEngineerFieldId,
          qaEstimateFieldId,
          releaseMrFieldId,
          releaseReadyStatusKey,
          statusPaletteByKey,
          testingFlowMode,
          zeroDevPositiveQa,
        },
        fieldRows,
      ),
    [
      configBase,
      devAssigneeFieldId,
      devEstimateFieldId,
      embeddedTestingOnlyJoins,
      embeddedTestingOnlyRules,
      fieldRows,
      minSp,
      minTp,
      platformFieldId,
      platformValueMap,
      qaEngineerFieldId,
      qaEstimateFieldId,
      releaseMrFieldId,
      releaseReadyStatusKey,
      statusPaletteByKey,
      testingFlowMode,
      zeroDevPositiveQa,
    ],
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draftConfig) !== JSON.stringify(configBase),
    [configBase, draftConfig],
  );

  const testingOnlyRulesPreview = useMemo(
    () =>
      formatTestingOnlyRulesPreview({
        embeddedTestingOnlyJoins,
        embeddedTestingOnlyRules,
        fieldRows,
        t,
      }),
    [embeddedTestingOnlyJoins, embeddedTestingOnlyRules, fieldRows, t],
  );

  const footerSummaryText = useMemo(
    () =>
      resolveIntegrationFooterSummaryText({
        activeSubtab,
        platformMappingStats,
        statusMappingStats,
        t,
      }),
    [activeSubtab, platformMappingStats, statusMappingStats, t],
  );

  const applyLoadedConfig = useCallback(
    (cfg: TrackerConfigShape | undefined) => {
      setConfigBase(cloneConfigWithoutRevision(cfg));
      const setters = {
        initialIntegrationSnapshotRef,
        setConfigBase,
        setDevAssigneeFieldId,
        setDevEstimateFieldId,
        setEmbeddedTestingOnlyJoins,
        setEmbeddedTestingOnlyRules,
        setMinSp,
        setMinTp,
        setPlatformFieldId,
        setPlatformValueMap,
        setQaEngineerFieldId,
        setQaEstimateFieldId,
        setReleaseMrFieldId,
        setReleaseReadyStatusKey,
        setRevision,
        setStatusPaletteByKey,
        setTestingFlowMode,
        setZeroDevPositiveQa,
      };
      if (!cfg) {
        resetIntegrationFormToEmpty(setters);
        return;
      }
      hydrateIntegrationFormFromConfig(cfg, setters);
    },
    [],
  );

  const bumpIntegrationLoadNonce = useCallback(() => {
    setIntegrationLoadNonce((n) => n + 1);
  }, []);

  const applySaveSuccessRevision = useCallback(
    (data: { config?: { configRevision?: number } }) => {
      const rev = data.config?.configRevision;
      setRevision(typeof rev === "number" ? rev : null);
    },
    [],
  );

  useTrackerIntegrationFormAutoDefaults({
    embeddedTestingOnlyJoins,
    embeddedTestingOnlyRules,
    fieldRows,
    initialIntegrationSnapshotRef,
    integrationLoadNonce,
    lastReleaseDefaultsForLoadNonceRef,
    platformFieldId,
    platformFieldValues,
    platformValueMap,
    revision,
    setDevAssigneeFieldId,
    setDevEstimateFieldId,
    setEmbeddedTestingOnlyJoins,
    setEmbeddedTestingOnlyRules,
    setPlatformFieldId,
    setPlatformValueMap,
    setQaEngineerFieldId,
    setQaEstimateFieldId,
    setReleaseMrFieldId,
    setReleaseReadyStatusKey,
    testingFlowMode,
    trackerStatusesList,
  });

  return {
    activeSubtab,
    allFieldSelectOptions,
    applyLoadedConfig,
    applySaveSuccessRevision,
    bumpIntegrationLoadNonce,
    configBase,
    devAssigneeFieldId,
    devEstimateFieldId,
    draftConfig,
    embeddedTestingOnlyJoins,
    embeddedTestingOnlyRules,
    fieldSelectOptions,
    footerSummaryText,
    hasUnsavedChanges,
    mappingFieldSelectOptions,
    minSp,
    minTp,
    numericFieldSelectOptions,
    platformFieldId,
    platformFieldValues,
    platformMappingFilter,
    platformMappingStats,
    platformValueMap,
    qaEngineerFieldId,
    qaEstimateFieldId,
    releaseMrFieldId,
    releaseReadyStatusKey,
    releaseReadyStatusOptions,
    reloadConfirmArmed,
    revision,
    setActiveSubtab,
    setDevAssigneeFieldId,
    setDevEstimateFieldId,
    setEmbeddedTestingOnlyJoins,
    setEmbeddedTestingOnlyRules,
    setMinSp,
    setMinTp,
    setPlatformFieldId,
    setPlatformMappingFilter,
    setPlatformValueMap,
    setQaEngineerFieldId,
    setQaEstimateFieldId,
    setReleaseMrFieldId,
    setReleaseReadyStatusKey,
    setReloadConfirmArmed,
    setStatusPaletteByKey,
    setTestingFlowMode,
    statusPaletteByKey,
    statusRowsByCategory,
    statusTableRows,
    testingFlowMode,
    testingOnlyRulesPreview,
    visiblePlatformMappingRows,
    zeroDevPositiveQa,
  };
}
