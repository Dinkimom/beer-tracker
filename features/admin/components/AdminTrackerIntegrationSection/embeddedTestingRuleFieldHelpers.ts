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

export function operatorOptionsForFieldRow(
  row:
    | { id: string; key?: string; options?: string[]; schemaType?: string }
    | undefined,
  t: (key: string) => string,
): CustomSelectOption<EmbeddedTestingOnlyOperator>[] {
  if (fieldRowIsList(row)) {
    return [{ label: t("admin.plannerIntegration.operator.eq"), value: "eq" }];
  }
  if (fieldRowIsNumeric(row)) {
    return [
      { label: t("admin.plannerIntegration.operator.eq"), value: "eq" },
      { label: t("admin.plannerIntegration.operator.gt"), value: "gt" },
      { label: t("admin.plannerIntegration.operator.gte"), value: "gte" },
      { label: t("admin.plannerIntegration.operator.lt"), value: "lt" },
      { label: t("admin.plannerIntegration.operator.lte"), value: "lte" },
    ];
  }
  return [{ label: t("admin.plannerIntegration.operator.eq"), value: "eq" }];
}

export function normalizeRuleForFieldRow(
  row:
    | { id: string; key?: string; options?: string[]; schemaType?: string }
    | undefined,
  rule: EmbeddedTestingOnlyRuleForm,
  t: (key: string) => string,
): EmbeddedTestingOnlyRuleForm {
  const opts = operatorOptionsForFieldRow(row, t);
  const allowed = new Set(opts.map((o) => o.value));
  let operator = rule.operator;
  if (!allowed.has(operator)) {
    operator = "eq";
  }
  let value = rule.value;
  if (fieldRowIsList(row) && value && !(row!.options ?? []).includes(value)) {
    value = "";
  }
  return { ...rule, operator, value };
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
