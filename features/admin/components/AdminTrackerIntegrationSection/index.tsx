"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useI18n } from "@/contexts/LanguageContext";
import {
  badgeMuted,
  cardBody,
  cardHeader,
  cardShell,
  field,
  hCard,
  label,
  muted,
  tabBtnActive,
  tabBtnBase,
  tabBtnIdle,
  tabList,
} from "@/features/admin/adminUiTokens";

import { AdminTrackerIntegrationFooter } from "./components/AdminTrackerIntegrationFooter";
import { AdminTrackerIntegrationProcessSetupPanel } from "./components/AdminTrackerIntegrationProcessSetupPanel";
import { TrackerStatusMappingPanel } from "./components/TrackerStatusMappingPanel";
import { integrationSubtabs } from "./constants";
import {
  useTrackerIntegrationLoadSave,
  useTrackerMetadataLoad,
} from "./hooks/useTrackerIntegrationApi";
import {
  type TrackerIntegrationFieldRow,
  useTrackerIntegrationFormState,
} from "./hooks/useTrackerIntegrationFormState";
import { useTrackerMetadataPolling } from "./hooks/useTrackerMetadataPolling";
import { nextPaletteMap } from "./trackerIntegrationFormModel";
import { type TrackerStatusRowMeta } from "./types";

interface AdminTrackerIntegrationSectionProps {
  organizationId: string;
}

export function AdminTrackerIntegrationSection({
  organizationId,
}: AdminTrackerIntegrationSectionProps) {
  const { t } = useI18n();
  const integrationTabs = useMemo(() => integrationSubtabs(t), [t]);

  const [fieldRows, setFieldRows] = useState<TrackerIntegrationFieldRow[]>([]);
  const [trackerStatusesList, setTrackerStatusesList] = useState<
    TrackerStatusRowMeta[]
  >([]);

  const { loadMetadata, metaLoading } = useTrackerMetadataLoad({
    organizationId,
    setFieldRows,
    setTrackerStatusesList,
  });

  const form = useTrackerIntegrationFormState({
    fieldRows,
    organizationId,
    trackerStatusesList,
  });

  const { load, loading, saveTrackerIntegration, saving } =
    useTrackerIntegrationLoadSave({
      applyLoadedConfig: form.applyLoadedConfig,
      onAfterIntegrationLoad: form.bumpIntegrationLoadNonce,
      onSaveSuccess: form.applySaveSuccessRevision,
      organizationId,
    });

  useEffect(() => {
    void load();
  }, [load]);

  useTrackerMetadataPolling(organizationId, loadMetadata);

  async function save() {
    if (!organizationId) {
      toast.error(t("admin.plannerIntegration.pickOrganization"));
      return;
    }
    await saveTrackerIntegration(form.draftConfig);
  }

  const {
    activeSubtab,
    allFieldSelectOptions,
    devAssigneeFieldId,
    devEstimateFieldId,
    embeddedTestingOnlyJoins,
    embeddedTestingOnlyRules,
    fieldSelectOptions,
    footerSummaryText,
    hasUnsavedChanges,
    numericFieldSelectOptions,
    platformFieldId,
    platformFieldValues,
    platformFieldValuesLoading,
    platformMappingFilter,
    platformMappingStats,
    platformValueMap,
    qaEngineerFieldId,
    qaEstimateFieldId,
    releaseMrFieldId,
    reloadConfirmArmed,
    revision,
    setActiveSubtab,
    setDevAssigneeFieldId,
    setDevEstimateFieldId,
    setEmbeddedTestingOnlyJoins,
    setEmbeddedTestingOnlyRules,
    setPlatformFieldId,
    setPlatformMappingFilter,
    setPlatformValueMap,
    setQaEngineerFieldId,
    setQaEstimateFieldId,
    setReleaseMrFieldId,
    setReloadConfirmArmed,
    setStatusPaletteByKey,
    setTestingFlowMode,
    statusPaletteByKey,
    statusRowsByCategory,
    statusTableRows,
    testingFlowMode,
    testingOnlyRulesPreview,
    visiblePlatformMappingRows,
  } = form;

  return (
    <section className={`${cardShell} flex flex-col overflow-hidden`}>
      <div className="min-h-0 flex-1">
        <div className={cardHeader}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={hCard}>{t("admin.plannerIntegration.title")}</h2>
            {revision !== null ? (
              <span className={badgeMuted} title={t("admin.plannerIntegration.revisionTitle")}>
                rev.{revision}
              </span>
            ) : null}
          </div>
          <p className={`mt-1 max-w-3xl text-sm leading-relaxed ${muted}`}>
            {t("admin.plannerIntegration.intro")}
          </p>
        </div>
        <div className={`${cardBody} flex-1 space-y-5`}>
        <div
          aria-label={t("admin.plannerIntegration.subtabAria")}
          className={`${tabList} w-full`}
          role="tablist"
        >
          {integrationTabs.map((tab) => (
            <button
              key={tab.id}
              aria-controls={`ti-subtab-panel-${tab.id}`}
              aria-selected={activeSubtab === tab.id}
              className={`${tabBtnBase} ${activeSubtab === tab.id ? tabBtnActive : tabBtnIdle}`}
              id={`ti-subtab-${tab.id}`}
              role="tab"
              type="button"
              onClick={() => setActiveSubtab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          aria-labelledby={`ti-subtab-${activeSubtab}`}
          id={`ti-subtab-panel-${activeSubtab}`}
          role="tabpanel"
        >
          {activeSubtab === "process-setup" ? (
            <AdminTrackerIntegrationProcessSetupPanel
              allFieldSelectOptions={allFieldSelectOptions}
              devAssigneeFieldId={devAssigneeFieldId}
              devEstimateFieldId={devEstimateFieldId}
              embeddedTestingOnlyJoins={embeddedTestingOnlyJoins}
              embeddedTestingOnlyRules={embeddedTestingOnlyRules}
              fieldClass={field}
              fieldRows={fieldRows}
              fieldSelectOptions={fieldSelectOptions}
              label={label}
              muted={muted}
              numericFieldSelectOptions={numericFieldSelectOptions}
              platformFieldId={platformFieldId}
              platformFieldValues={platformFieldValues}
              platformFieldValuesLoading={platformFieldValuesLoading}
              platformMappingFilter={platformMappingFilter}
              platformMappingStats={platformMappingStats}
              platformValueMap={platformValueMap}
              qaEngineerFieldId={qaEngineerFieldId}
              qaEstimateFieldId={qaEstimateFieldId}
              releaseMrFieldId={releaseMrFieldId}
              setDevAssigneeFieldId={setDevAssigneeFieldId}
              setDevEstimateFieldId={setDevEstimateFieldId}
              setEmbeddedTestingOnlyJoins={setEmbeddedTestingOnlyJoins}
              setEmbeddedTestingOnlyRules={setEmbeddedTestingOnlyRules}
              setPlatformFieldId={setPlatformFieldId}
              setPlatformMappingFilter={setPlatformMappingFilter}
              setPlatformValueMap={setPlatformValueMap}
              setQaEngineerFieldId={setQaEngineerFieldId}
              setQaEstimateFieldId={setQaEstimateFieldId}
              setReleaseMrFieldId={setReleaseMrFieldId}
              setTestingFlowMode={setTestingFlowMode}
              tabBtnBase={tabBtnBase}
              tabBtnIdle={tabBtnIdle}
              testingFlowMode={testingFlowMode}
              testingOnlyRulesPreview={testingOnlyRulesPreview}
              visiblePlatformMappingRows={visiblePlatformMappingRows}
            />
          ) : null}

          {activeSubtab === "statuses-mapping" ? (
            <TrackerStatusMappingPanel
              getStoredPaletteKey={(k) => statusPaletteByKey[k] ?? ""}
              isEmpty={statusTableRows.length === 0}
              metaLoading={metaLoading}
              mutedClass={muted}
              sections={statusRowsByCategory}
              onPaletteChange={(statusKey, next) =>
                setStatusPaletteByKey((p) => nextPaletteMap(p, statusKey, next))
              }
            />
          ) : null}
        </div>
        </div>
      </div>

      <AdminTrackerIntegrationFooter
        footerSummaryText={footerSummaryText}
        hasUnsavedChanges={hasUnsavedChanges}
        loading={loading}
        reloadConfirmArmed={reloadConfirmArmed}
        saving={saving}
        setReloadConfirmArmed={setReloadConfirmArmed}
        onReload={() => void load()}
        onSave={() => void save()}
      />
    </section>
  );
}
