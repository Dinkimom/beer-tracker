import type {
  EmbeddedTestingOnlyOperator,
  EmbeddedTestingOnlyRuleForm,
} from "./types";
import type { CustomSelectOption } from "@/components/CustomSelect";

export function fieldRowIsList(row: { options?: string[] } | undefined): boolean {
  return (row?.options?.length ?? 0) > 0;
}

export function fieldRowIsNumeric(
  row: { id: string; key?: string; schemaType?: string } | undefined,
): boolean {
  if (!row) {
    return false;
  }
  const t = (row.schemaType ?? "").toLowerCase();
  const key = (row.key ?? "").toLowerCase();
  const id = row.id.toLowerCase();
  if (
    key === "storypoints" ||
    key === "testpoints" ||
    id === "storypoints" ||
    id === "testpoints"
  ) {
    return true;
  }
  return (
    t === "integer" ||
    t === "number" ||
    t === "float" ||
    t === "double" ||
    t === "int"
  );
}

interface RuleFieldRow {
  id: string;
  key?: string;
  options?: string[];
  schemaType?: string;
}

function comparisonOperatorOptions(
  t: (key: string) => string,
): CustomSelectOption<EmbeddedTestingOnlyOperator>[] {
  return [
    { label: t("admin.plannerIntegration.operator.eq"), value: "eq" },
    { label: t("admin.plannerIntegration.operator.gt"), value: "gt" },
    { label: t("admin.plannerIntegration.operator.gte"), value: "gte" },
    { label: t("admin.plannerIntegration.operator.lt"), value: "lt" },
    { label: t("admin.plannerIntegration.operator.lte"), value: "lte" },
  ];
}

function equalsOperatorOption(
  t: (key: string) => string,
): CustomSelectOption<EmbeddedTestingOnlyOperator> {
  return { label: t("admin.plannerIntegration.operator.eq"), value: "eq" };
}

export function operatorOptionsForFieldRow(
  row: RuleFieldRow | undefined,
  t: (key: string) => string,
): CustomSelectOption<EmbeddedTestingOnlyOperator>[] {
  if (!row) {
    return comparisonOperatorOptions(t);
  }
  if (fieldRowIsList(row)) {
    return [equalsOperatorOption(t)];
  }
  if (fieldRowIsNumeric(row)) {
    return comparisonOperatorOptions(t);
  }
  return [equalsOperatorOption(t)];
}

export function normalizeRuleForFieldRow(
  row: RuleFieldRow | undefined,
  rule: EmbeddedTestingOnlyRuleForm,
  t: (key: string) => string,
): EmbeddedTestingOnlyRuleForm {
  if (!row) {
    return rule;
  }
  const opts = operatorOptionsForFieldRow(row, t);
  const allowed = new Set(opts.map((o) => o.value));
  let operator = rule.operator;
  if (!allowed.has(operator)) {
    operator = "eq";
  }
  let value = rule.value;
  if (fieldRowIsList(row) && value && !(row.options ?? []).includes(value)) {
    value = "";
  }
  return { ...rule, operator, value };
}

const CANONICAL_RULE_FIELD_TO_MAPPING = {
  functionalTeam: "platformFieldId",
  storyPoints: "devEstimateFieldId",
  testPoints: "qaEstimateFieldId",
} as const;

export interface EmbeddedTestingRuleFieldMapping {
  devEstimateFieldId: string;
  platformFieldId: string;
  qaEstimateFieldId: string;
}

export function storedAccessorForMappedFieldId<T extends { id: string; key?: string }>(
  rows: T[],
  fieldId: string,
): string {
  const row = findFieldRowByStoredAccessor(rows, fieldId);
  if (!row) {
    return "";
  }
  return toStoredFieldAccessor(rows, row.id);
}

export function rebindEmbeddedTestingRuleFieldId<T extends { id: string; key?: string }>(
  fieldId: string,
  rows: T[],
  mapping: EmbeddedTestingRuleFieldMapping,
): string {
  const trimmed = fieldId.trim();
  if (!trimmed || findFieldRowByStoredAccessor(rows, trimmed)) {
    return fieldId;
  }
  const mappingKey =
    CANONICAL_RULE_FIELD_TO_MAPPING[
      trimmed as keyof typeof CANONICAL_RULE_FIELD_TO_MAPPING
    ];
  if (!mappingKey) {
    return fieldId;
  }
  const stored = storedAccessorForMappedFieldId(rows, mapping[mappingKey]);
  return stored || fieldId;
}

export function findFieldRowByStoredAccessor<T extends { id: string; key?: string }>(
  rows: T[],
  accessor: string,
): T | undefined {
  const a = accessor.trim();
  if (!a) {
    return undefined;
  }
  return rows.find((r) => r.id === a || (r.key ?? "") === a);
}

export function toStoredFieldAccessor<T extends { id: string; key?: string }>(
  rows: T[],
  uiFieldId: string,
): string {
  const row = rows.find((r) => r.id === uiFieldId);
  if (!row) {
    return uiFieldId;
  }
  const key = (row.key ?? "").trim();
  return key || row.id;
}

export function toUiFieldValueFromStoredAccessor<
  T extends { id: string; key?: string },
>(rows: T[], accessor: string): string {
  return findFieldRowByStoredAccessor(rows, accessor)?.id ?? accessor;
}
