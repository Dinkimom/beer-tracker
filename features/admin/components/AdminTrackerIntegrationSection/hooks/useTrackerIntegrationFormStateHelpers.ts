import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
  PlatformValueMapFormRow,
  TrackerConfigShape,
} from "../types";
import type { MutableRefObject } from "react";

import {
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
