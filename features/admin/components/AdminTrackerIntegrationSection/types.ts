export type { TrackerConfigShape } from "@/lib/api/admin/types";

export const UNCATEGORIZED = "uncategorized" as const;

export interface TrackerStatusRowMeta {
  display: string;
  key: string;
  statusTypeKey?: string;
}

export type EmbeddedTestingOnlyJoin = "and" | "or";
export type EmbeddedTestingOnlyOperator = "eq" | "gt" | "gte" | "lt" | "lte";

export interface EmbeddedTestingOnlyRuleForm {
  fieldId: string;
  operator: EmbeddedTestingOnlyOperator;
  value: string;
}

export interface PlatformValueMapFormRow {
  platform: "Back" | "DevOps" | "QA" | "Web";
  trackerValue: string;
}

export type { PlatformMappingFilter } from "@/lib/trackerIntegration/platformMappingFilter";

export type IntegrationSubtabId = "other" | "process-setup" | "statuses-mapping";
