import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyOperator,
  EmbeddedTestingOnlyRuleForm,
  IntegrationSubtabId,
  PlatformValueMapFormRow,
  TrackerConfigShape,
} from "../types";
import type { TrackerIntegrationFieldRow } from "./useTrackerIntegrationFormState";
import type { MutableRefObject } from "react";

import {
  findFieldRowByStoredAccessor,
} from "../embeddedTestingRuleFieldHelpers";
import {
  joinAdminMetaLabels,
  pickEmbeddedTestingOnlyForm,
  pickOccupancyThresholds,
  pickPlatformFieldId,
  pickPlatformValueMap,
  pickReleaseReadinessForm,
  pickStatusPaletteOverrides,
  pickTestingFlowMode,
  pickTestingFlowStrings,
  pickZeroDevPositiveQa,
} from "../trackerIntegrationFormModel";

type TranslateFn = (
  key: string,
  params?: Record<string, number | string>,
) => string;

const EMBEDDED_TESTING_OPERATOR_LABEL: Record<EmbeddedTestingOnlyOperator, string> = {
  eq: "=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
};

export function formatTestingOnlyRulesPreview(params: {
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  fieldRows: TrackerIntegrationFieldRow[];
  t: TranslateFn;
}): string {
  const { embeddedTestingOnlyJoins, embeddedTestingOnlyRules, fieldRows, t } = params;
  if (embeddedTestingOnlyRules.length === 0) {
    return t("admin.plannerIntegration.rulesPreview.noRules");
  }
  return embeddedTestingOnlyRules
    .map((rule, idx) => {
      const row = findFieldRowByStoredAccessor(fieldRows, rule.fieldId);
      const fieldLabel = joinAdminMetaLabels(
        [row?.display, row?.name, row?.key],
        rule.fieldId || t("admin.plannerIntegration.rulesPreview.fieldFallback"),
      );
      const valueLabel = rule.value.trim()
        ? rule.value
        : t("admin.plannerIntegration.rulesPreview.emptyValue");
      const expression = `${fieldLabel} ${EMBEDDED_TESTING_OPERATOR_LABEL[rule.operator]} ${valueLabel}`;
      if (idx === 0) {
        return expression;
      }
      const join =
        embeddedTestingOnlyJoins[idx - 1] === "or"
          ? t("admin.plannerIntegration.rulesPreview.joinOr")
          : t("admin.plannerIntegration.rulesPreview.joinAnd");
      return `${join} ${expression}`;
    })
    .join(" ");
}

export function resolveIntegrationFooterSummaryText(params: {
  activeSubtab: IntegrationSubtabId;
  platformMappingStats: { changed: number; total: number; unmapped: number };
  statusMappingStats: { categories: number; customColor: number; total: number };
  t: TranslateFn;
}): string {
  const { activeSubtab, platformMappingStats, statusMappingStats, t } =
    params;

  if (activeSubtab === "statuses-mapping") {
    return t("admin.plannerIntegration.footer.summaryStatuses", {
      total: statusMappingStats.total,
      categories: statusMappingStats.categories,
      customColor: statusMappingStats.customColor,
    });
  }
  return t("admin.plannerIntegration.footer.summaryPlatforms", {
    total: platformMappingStats.total,
    unmapped: platformMappingStats.unmapped,
    changed: platformMappingStats.changed,
  });
}

interface IntegrationFormHydrationSetters {
  initialIntegrationSnapshotRef: MutableRefObject<{
    hadEmbeddedTestingOnlyExtraRules: boolean;
    hadPlatformField: boolean;
    hadPlatformMap: boolean;
  } | null>;
  setConfigBase: (cfg: TrackerConfigShape) => void;
  setDevAssigneeFieldId: (value: string) => void;
  setDevEstimateFieldId: (value: string) => void;
  setEmbeddedTestingOnlyJoins: (value: EmbeddedTestingOnlyJoin[]) => void;
  setEmbeddedTestingOnlyRules: (value: EmbeddedTestingOnlyRuleForm[]) => void;
  setMinSp: (value: string) => void;
  setMinTp: (value: string) => void;
  setPlatformFieldId: (value: string) => void;
  setPlatformValueMap: (value: PlatformValueMapFormRow[]) => void;
  setQaEngineerFieldId: (value: string) => void;
  setQaEstimateFieldId: (value: string) => void;
  setReleaseMrFieldId: (value: string) => void;
  setReleaseReadyStatusKey: (value: string) => void;
  setRevision: (value: number | null) => void;
  setStatusPaletteByKey: (value: Record<string, string>) => void;
  setTestingFlowMode: (value: "embedded" | "standalone") => void;
  setZeroDevPositiveQa: (value: boolean) => void;
}

export function resetIntegrationFormToEmpty(setters: IntegrationFormHydrationSetters): void {
  setters.setRevision(null);
  setters.setReleaseReadyStatusKey("");
  setters.setReleaseMrFieldId("");
  setters.initialIntegrationSnapshotRef.current = {
    hadEmbeddedTestingOnlyExtraRules: false,
    hadPlatformField: false,
    hadPlatformMap: false,
  };
}

export function hydrateIntegrationFormFromConfig(
  cfg: TrackerConfigShape,
  setters: IntegrationFormHydrationSetters,
): void {
  const rev = cfg.configRevision;
  setters.setRevision(typeof rev === "number" ? rev : 0);

  const th = pickOccupancyThresholds(cfg);
  setters.setMinSp(th.minSp);
  setters.setMinTp(th.minTp);

  const rel = pickReleaseReadinessForm(cfg);
  setters.setReleaseReadyStatusKey(rel.readyStatusKey);
  setters.setReleaseMrFieldId(rel.mrFieldId);

  const flow = pickTestingFlowStrings(cfg);
  setters.setDevAssigneeFieldId(flow.devAssigneeFieldId);
  setters.setDevEstimateFieldId(flow.devEstimateFieldId);
  setters.setQaEngineerFieldId(flow.qaEngineerFieldId);
  setters.setQaEstimateFieldId(flow.qaEstimateFieldId);
  setters.setTestingFlowMode(pickTestingFlowMode(cfg));
  setters.setZeroDevPositiveQa(pickZeroDevPositiveQa(cfg));

  const embeddedForm = pickEmbeddedTestingOnlyForm(cfg);
  setters.setEmbeddedTestingOnlyRules(embeddedForm.rules);
  setters.setEmbeddedTestingOnlyJoins(embeddedForm.joins);
  setters.setPlatformFieldId(pickPlatformFieldId(cfg));
  setters.setPlatformValueMap(pickPlatformValueMap(cfg));
  setters.setStatusPaletteByKey(pickStatusPaletteOverrides(cfg));

  setters.initialIntegrationSnapshotRef.current = {
    hadEmbeddedTestingOnlyExtraRules: embeddedForm.rules.length > 0,
    hadPlatformField: !!pickPlatformFieldId(cfg),
    hadPlatformMap: pickPlatformValueMap(cfg).length > 0,
  };
}
