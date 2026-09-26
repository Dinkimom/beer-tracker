import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyOperator,
  EmbeddedTestingOnlyRuleForm,
  PlatformValueMapFormRow,
  TrackerConfigShape,
} from "./types";

import { canonicalPaletteKey } from "@/utils/statusColors";

import {
  mergeTrackerIntegrationConfigSections,
  type TrackerIntegrationConfigForm,
} from "./trackerIntegrationConfigMerge";
import {
  dedupeAdminMetaLabelParts,
  parsePlatformValueMapRow,
  parseStatusPaletteOverrideEntry,
} from "./trackerIntegrationFormModelPickHelpers";

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

export function cloneConfigWithoutRevision(
  cfg: TrackerConfigShape | undefined,
): TrackerConfigShape {
  if (!cfg) {
    return {};
  }
  const rest = { ...cfg };
  delete rest.configRevision;
  try {
    return JSON.parse(JSON.stringify(rest)) as TrackerConfigShape;
  } catch {
    return {};
  }
}

export function pickTestingFlowStrings(cfg: TrackerConfigShape | undefined): {
  devAssigneeFieldId: string;
  devEstimateFieldId: string;
  qaEngineerFieldId: string;
  qaEstimateFieldId: string;
} {
  const tf = asRecord(cfg?.testingFlow);
  return {
    devAssigneeFieldId:
      typeof tf?.devAssigneeFieldId === "string" ? tf.devAssigneeFieldId : "",
    devEstimateFieldId:
      typeof tf?.devEstimateFieldId === "string" ? tf.devEstimateFieldId : "",
    qaEngineerFieldId:
      typeof tf?.qaEngineerFieldId === "string" ? tf.qaEngineerFieldId : "",
    qaEstimateFieldId:
      typeof tf?.qaEstimateFieldId === "string" ? tf.qaEstimateFieldId : "",
  };
}

function isEmbeddedTestingOperator(
  v: unknown,
): v is EmbeddedTestingOnlyOperator {
  return v === "eq" || v === "gt" || v === "lt" || v === "gte" || v === "lte";
}

function pickStoredEmbeddedTestingJoins(tf: Record<string, unknown> | null): EmbeddedTestingOnlyJoin[] {
  if (!Array.isArray(tf?.embeddedTestingOnlyJoins)) {
    return [];
  }
  return (tf.embeddedTestingOnlyJoins as unknown[]).filter(
    (x): x is EmbeddedTestingOnlyJoin => x === "and" || x === "or",
  );
}

function buildStoredJoins(
  rulesLength: number,
  joinsStored: EmbeddedTestingOnlyJoin[],
): EmbeddedTestingOnlyJoin[] {
  const need = Math.max(0, rulesLength - 1);
  const joins: EmbeddedTestingOnlyJoin[] = [];
  for (let i = 0; i < need; i++) {
    joins.push(joinsStored[i] === "or" ? "or" : "and");
  }
  return joins;
}

function pickOperatorRule(row: unknown): EmbeddedTestingOnlyRuleForm | null {
  const rec = asRecord(row);
  const fieldId = typeof rec?.fieldId === "string" ? rec.fieldId.trim() : "";
  const op = rec?.operator;
  const value = typeof rec?.value === "string" ? rec.value : "";
  if (!fieldId || !isEmbeddedTestingOperator(op)) {
    return null;
  }
  return { fieldId, operator: op, value };
}

function pickOperatorRules(raw: unknown[]): EmbeddedTestingOnlyRuleForm[] {
  const rules: EmbeddedTestingOnlyRuleForm[] = [];
  for (const row of raw) {
    const rule = pickOperatorRule(row);
    if (rule) {
      rules.push(rule);
    }
  }
  return rules;
}

function pickLegacyValues(row: unknown): { fieldId: string; values: string[] } | null {
  const rec = asRecord(row);
  const fieldId = typeof rec?.fieldId === "string" ? rec.fieldId.trim() : "";
  if (!fieldId) {
    return null;
  }
  const valsRaw = Array.isArray(rec?.values) ? rec.values : [];
  const values = valsRaw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length > 0 ? { fieldId, values } : null;
}

function appendLegacyValueRules(
  target: { joins: EmbeddedTestingOnlyJoin[]; rules: EmbeddedTestingOnlyRuleForm[] },
  fieldId: string,
  values: string[],
): void {
  if (target.rules.length > 0) {
    target.joins.push("and");
  }
  for (let i = 0; i < values.length; i++) {
    if (target.rules.length > 0 && i > 0) {
      target.joins.push("or");
    }
    target.rules.push({ fieldId, operator: "eq", value: values[i]! });
  }
}

function pickLegacyValueRules(raw: unknown[]): {
  joins: EmbeddedTestingOnlyJoin[];
  rules: EmbeddedTestingOnlyRuleForm[];
} {
  const result: { joins: EmbeddedTestingOnlyJoin[]; rules: EmbeddedTestingOnlyRuleForm[] } = {
    joins: [],
    rules: [],
  };
  for (const row of raw) {
    const parsed = pickLegacyValues(row);
    if (parsed) {
      appendLegacyValueRules(result, parsed.fieldId, parsed.values);
    }
  }
  return result;
}

export function pickEmbeddedTestingOnlyForm(cfg: TrackerConfigShape | undefined): {
  joins: EmbeddedTestingOnlyJoin[];
  rules: EmbeddedTestingOnlyRuleForm[];
} {
  const tf = asRecord(cfg?.testingFlow);
  const raw = tf?.embeddedTestingOnlyRules;
  if (!Array.isArray(raw) || raw.length === 0) {
    return { rules: [], joins: [] };
  }

  const first = asRecord(raw[0]);
  const joinsStored = pickStoredEmbeddedTestingJoins(tf);

  if (first && isEmbeddedTestingOperator(first.operator)) {
    const rules = pickOperatorRules(raw);
    return { rules, joins: buildStoredJoins(rules.length, joinsStored) };
  }

  return pickLegacyValueRules(raw);
}

export function pickTestingFlowMode(
  cfg: TrackerConfigShape | undefined,
): "embedded" | "standalone" {
  const m = asRecord(cfg?.testingFlow)?.mode;
  return m === "standalone_qa_tasks" ? "standalone" : "embedded";
}

export function pickPlatformFieldId(cfg: TrackerConfigShape | undefined): string {
  const p = asRecord(cfg?.platform);
  return typeof p?.fieldId === "string" ? p.fieldId : "";
}

export function pickPlatformValueMap(
  cfg: TrackerConfigShape | undefined,
): PlatformValueMapFormRow[] {
  const p = asRecord(cfg?.platform);
  const vm = p?.valueMap;
  if (!Array.isArray(vm)) {
    return [];
  }
  const out: PlatformValueMapFormRow[] = [];
  for (const row of vm) {
    const parsed = parsePlatformValueMapRow(row);
    if (parsed) {
      out.push(parsed);
    }
  }
  return out;
}

export function pickZeroDevPositiveQa(cfg: TrackerConfigShape | undefined): boolean {
  return asRecord(cfg?.testingFlow)?.zeroDevPositiveQaRule === true;
}

export function nextPaletteMap(
  prev: Record<string, string>,
  statusKey: string,
  next: string,
): Record<string, string> {
  const copy = { ...prev };
  if (!next.trim()) {
    delete copy[statusKey];
  } else {
    copy[statusKey] = canonicalPaletteKey(next);
  }
  return copy;
}

export function pickStatusPaletteOverrides(
  cfg: TrackerConfigShape | undefined,
): Record<string, string> {
  const st = asRecord(cfg?.statuses);
  const ov = st?.overridesByStatusKey;
  if (!ov || typeof ov !== "object" || Array.isArray(ov)) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(ov as Record<string, unknown>)) {
    const entry = parseStatusPaletteOverrideEntry(key, raw);
    if (entry) {
      out[entry[0]] = entry[1];
    }
  }
  return out;
}

export function pickOccupancyThresholds(cfg: TrackerConfigShape | undefined): {
  minSp: string;
  minTp: string;
} {
  const vt = asRecord(cfg?.validationThresholds);
  const occ = asRecord(vt?.occupancy);
  return {
    minSp:
      typeof occ?.minStoryPointsForAssignee === "number" &&
      Number.isFinite(occ.minStoryPointsForAssignee)
        ? String(occ.minStoryPointsForAssignee)
        : "",
    minTp:
      typeof occ?.minTestPointsForAssignee === "number" &&
      Number.isFinite(occ.minTestPointsForAssignee)
        ? String(occ.minTestPointsForAssignee)
        : "",
  };
}

export function pickReleaseReadinessForm(cfg: TrackerConfigShape | undefined): {
  mrFieldId: string;
  readyStatusKey: string;
} {
  const rr = asRecord(cfg?.releaseReadiness);
  return {
    mrFieldId:
      typeof rr?.mergeRequestFieldId === "string"
        ? rr.mergeRequestFieldId.trim()
        : "",
    readyStatusKey:
      typeof rr?.readyStatusKey === "string" ? rr.readyStatusKey.trim() : "",
  };
}

const MERGE_REQUEST_FIELD_ALIASES = [
  "MergeRequestLink",
  "merge request",
  "merge request link",
  "merge request url",
  "mr link",
  "pull request",
  "pull request url",
] as const;

function fieldRowAliasBlob(row: {
  display?: string;
  id: string;
  key?: string;
  name?: string;
}): string {
  return [row.id, row.key, row.name, row.display]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" ")
    .toLowerCase()
    .replaceAll(/[\s_-]+/g, "");
}

export function resolveMergeRequestFieldId(
  rows: Array<{ display?: string; id: string; key?: string; name?: string }>,
): string {
  for (const alias of MERGE_REQUEST_FIELD_ALIASES) {
    const id = resolveFieldIdByAlias(rows, alias);
    if (id) {
      return id;
    }
  }
  const fuzzy = rows.find((row) => {
    const blob = fieldRowAliasBlob(row);
    return blob.includes("mergerequest") || blob.includes("pullrequest");
  });
  return fuzzy?.id ?? "";
}

export function resolveFieldIdByAlias(
  rows: Array<{ id: string; key?: string; name?: string; display?: string }>,
  alias: string,
): string {
  const needle = alias.trim().toLowerCase();
  if (!needle) {
    return "";
  }
  const row = rows.find((r) => {
    const id = r.id.trim().toLowerCase();
    const key = (r.key ?? "").trim().toLowerCase();
    const name = (r.name ?? "").trim().toLowerCase();
    const display = (r.display ?? "").trim().toLowerCase();
    return (
      id === needle || key === needle || name === needle || display === needle
    );
  });
  return row?.id ?? "";
}

/** Подпись в селектах: без повторов одного и того же текста (регистр не важен). */
export function joinAdminMetaLabels(
  parts: Array<string | null | undefined>,
  fallback: string,
): string {
  const out = dedupeAdminMetaLabelParts(parts);
  return out.length > 0 ? out.join(" · ") : fallback;
}

export function mergeFormIntoConfig(
  base: TrackerConfigShape,
  form: TrackerIntegrationConfigForm,
  fieldRows: Array<{ id: string; key?: string }>,
): TrackerConfigShape {
  const next: TrackerConfigShape = { ...base };
  mergeTrackerIntegrationConfigSections(next, form, fieldRows);

  return next;
}
