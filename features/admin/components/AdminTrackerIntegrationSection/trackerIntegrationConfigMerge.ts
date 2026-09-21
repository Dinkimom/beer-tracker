import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
  PlatformValueMapFormRow,
  TrackerConfigShape,
} from "./types";

import { canonicalPaletteKey } from "@/utils/statusColors";

import { toStoredFieldAccessor } from "./embeddedTestingRuleFieldHelpers";

export interface TrackerIntegrationConfigForm {
  devAssigneeFieldId: string;
  devEstimateFieldId: string;
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  minSp: string;
  minTp: string;
  platformFieldId: string;
  platformValueMap: PlatformValueMapFormRow[];
  qaEngineerFieldId: string;
  qaEstimateFieldId: string;
  releaseMrFieldId: string;
  releaseReadyStatusKey: string;
  statusPaletteByKey: Record<string, string>;
  testingFlowMode: "embedded" | "standalone";
  zeroDevPositiveQa: boolean;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function applyPlatformConfig(next: TrackerConfigShape, form: TrackerIntegrationConfigForm): void {
  const platformFieldId = form.platformFieldId.trim();
  const nextValueMap = form.platformValueMap
    .map((row) => ({
      platform: row.platform,
      trackerValue: row.trackerValue.trim(),
    }))
    .filter((row) => row.trackerValue);
  if (platformFieldId && nextValueMap.length > 0) {
    next.platform = {
      fieldId: platformFieldId,
      source: "field",
      valueMap: nextValueMap,
    };
  } else {
    delete next.platform;
  }
}

function setOptionalString(target: Record<string, unknown>, key: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) {
    target[key] = trimmed;
  } else {
    delete target[key];
  }
}

function normalizeEmbeddedRules(
  rules: EmbeddedTestingOnlyRuleForm[],
): EmbeddedTestingOnlyRuleForm[] {
  return rules
    .map((r) => ({
      fieldId: r.fieldId.trim(),
      operator: r.operator,
      value: r.value.trim(),
    }))
    .filter((r) => r.fieldId && r.value !== "");
}

function normalizeEmbeddedJoins(
  joins: EmbeddedTestingOnlyJoin[],
  needJoins: number,
): EmbeddedTestingOnlyJoin[] {
  const next = joins.slice(0, needJoins);
  while (next.length < needJoins) {
    next.push("and");
  }
  return next.map((x) => (x === "or" ? "or" : "and"));
}

function applyEmbeddedTestingRules(
  target: Record<string, unknown>,
  form: TrackerIntegrationConfigForm,
): void {
  const embeddedRules = normalizeEmbeddedRules(form.embeddedTestingOnlyRules);
  if (embeddedRules.length === 0) {
    delete target.embeddedTestingOnlyRules;
    delete target.embeddedTestingOnlyJoins;
    return;
  }
  target.embeddedTestingOnlyRules = embeddedRules;
  const needJoins = embeddedRules.length - 1;
  if (needJoins > 0) {
    target.embeddedTestingOnlyJoins = normalizeEmbeddedJoins(
      form.embeddedTestingOnlyJoins,
      needJoins,
    );
  } else {
    delete target.embeddedTestingOnlyJoins;
  }
}

function applyTestingFlowModeFlags(
  tf: Record<string, unknown>,
  form: TrackerIntegrationConfigForm,
): void {
  if (form.testingFlowMode === "standalone") {
    tf.mode = "standalone_qa_tasks";
  } else {
    delete tf.mode;
  }
  if (form.zeroDevPositiveQa) {
    tf.zeroDevPositiveQaRule = true;
  } else {
    delete tf.zeroDevPositiveQaRule;
  }
}

function buildStatusPaletteOverrides(
  form: TrackerIntegrationConfigForm,
): Record<string, { visualToken: string }> {
  const overrides: Record<string, { visualToken: string }> = {};
  for (const [rawKey, rawPal] of Object.entries(form.statusPaletteByKey)) {
    const key = rawKey.trim();
    const palette = rawPal.trim();
    if (key && palette) {
      overrides[key] = { visualToken: canonicalPaletteKey(palette) };
    }
  }
  return overrides;
}

function applyTestingFlowConfig(next: TrackerConfigShape, form: TrackerIntegrationConfigForm): void {
  const tfBase = asRecord(next.testingFlow) ?? {};
  const tf: Record<string, unknown> = { ...tfBase };
  applyTestingFlowModeFlags(tf, form);
  setOptionalString(tf, "devAssigneeFieldId", form.devAssigneeFieldId);
  setOptionalString(tf, "devEstimateFieldId", form.devEstimateFieldId);
  setOptionalString(tf, "qaEngineerFieldId", form.qaEngineerFieldId);
  setOptionalString(tf, "qaEstimateFieldId", form.qaEstimateFieldId);
  applyEmbeddedTestingRules(tf, form);
  if (Object.keys(tf).length > 0) {
    next.testingFlow = tf;
  } else {
    delete next.testingFlow;
  }
}

function applyStatusPaletteConfig(next: TrackerConfigShape, form: TrackerIntegrationConfigForm): void {
  const prevStatuses = asRecord(next.statuses) ?? {};
  const nextStatuses: Record<string, unknown> = { ...prevStatuses };
  const overrides = buildStatusPaletteOverrides(form);
  if (Object.keys(overrides).length > 0) {
    nextStatuses.overridesByStatusKey = overrides;
  } else {
    delete nextStatuses.overridesByStatusKey;
  }
  if (Object.keys(nextStatuses).length > 0) {
    next.statuses = nextStatuses;
  } else {
    delete next.statuses;
  }
}

function applyOptionalNonNegativeNumber(
  target: Record<string, unknown>,
  key: string,
  raw: string,
): void {
  const trimmed = raw.trim();
  if (trimmed === "") {
    delete target[key];
    return;
  }
  const n = Number(trimmed);
  if (Number.isFinite(n) && n >= 0) {
    target[key] = n;
  }
}

function applyValidationThresholdConfig(
  next: TrackerConfigShape,
  form: TrackerIntegrationConfigForm,
): void {
  const vtBase = asRecord(next.validationThresholds) ?? {};
  const vt: Record<string, unknown> = { ...vtBase };
  const occBase = asRecord(vt.occupancy) ?? {};
  const occ: Record<string, unknown> = { ...occBase };
  applyOptionalNonNegativeNumber(occ, "minStoryPointsForAssignee", form.minSp);
  applyOptionalNonNegativeNumber(occ, "minTestPointsForAssignee", form.minTp);
  if (Object.keys(occ).length > 0) {
    vt.occupancy = occ;
  } else {
    delete vt.occupancy;
  }
  if (Object.keys(vt).length > 0) {
    next.validationThresholds = vt;
  } else {
    delete next.validationThresholds;
  }
}

function applyReleaseReadinessConfig(
  next: TrackerConfigShape,
  form: TrackerIntegrationConfigForm,
  fieldRows: Array<{ id: string; key?: string }>,
): void {
  const readyStatusKey = form.releaseReadyStatusKey.trim();
  const mrRaw = form.releaseMrFieldId.trim();
  const mrStored = mrRaw ? toStoredFieldAccessor(fieldRows, mrRaw) : "";
  next.releaseReadiness = {
    ...(readyStatusKey ? { readyStatusKey } : {}),
    ...(mrStored ? { mergeRequestFieldId: mrStored } : {}),
  };
}

export function mergeTrackerIntegrationConfigSections(
  next: TrackerConfigShape,
  form: TrackerIntegrationConfigForm,
  fieldRows: Array<{ id: string; key?: string }>,
): void {
  applyPlatformConfig(next, form);
  applyTestingFlowConfig(next, form);
  applyStatusPaletteConfig(next, form);
  applyValidationThresholdConfig(next, form);
  applyReleaseReadinessConfig(next, form, fieldRows);
}
