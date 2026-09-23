import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
  PlatformValueMapFormRow,
  TrackerStatusRowMeta,
} from "../types";
import type { TrackerIntegrationFieldRow } from "./useTrackerIntegrationFormState";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { useEffect } from "react";

import {
  buildAutoPlatformValueMap,
  findFunctionalTeamFieldId,
} from "@/lib/trackerIntegration/smartIntegrationDefaults";

import { toUiFieldValueFromStoredAccessor } from "../embeddedTestingRuleFieldHelpers";
import {
  resolveFieldIdByAlias,
  resolveMergeRequestFieldId,
} from "../trackerIntegrationFormModel";

import { trackerStatusIdentity } from "./useTrackerIntegrationApiHelpers";
import {
  buildEmbeddedTestingAutoDefaultsUpdate,
  readEmbeddedTestingSnapshot,
  shouldSkipEmbeddedTestingAutoDefaults,
} from "./useTrackerIntegrationFormAutoDefaultsHelpers";

function scheduleFormAutoDefault(update: () => void): void {
  queueMicrotask(update);
}

function defaultReleaseReadyStatusKey(
  current: string,
  statuses: TrackerStatusRowMeta[],
): string {
  if (current.trim()) {
    return current;
  }
  const row = statuses.find((status) => status.key.trim().toLowerCase() === "rc");
  return row ? trackerStatusIdentity(row) : current;
}

function defaultReleaseMrFieldId(
  current: string,
  fieldRows: TrackerIntegrationFieldRow[],
): string {
  if (current.trim()) {
    return current;
  }
  return resolveMergeRequestFieldId(fieldRows) || current;
}

export function useTrackerIntegrationFormAutoDefaults(options: {
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  fieldRows: TrackerIntegrationFieldRow[];
  initialIntegrationSnapshotRef: MutableRefObject<{
    hadEmbeddedTestingOnlyExtraRules: boolean;
    hadPlatformField: boolean;
    hadPlatformMap: boolean;
  } | null>;
  integrationLoadNonce: number;
  lastReleaseDefaultsForLoadNonceRef: MutableRefObject<number>;
  platformFieldId: string;
  platformFieldValues: string[];
  platformValueMap: PlatformValueMapFormRow[];
  revision: number | null;
  setDevAssigneeFieldId: Dispatch<SetStateAction<string>>;
  setDevEstimateFieldId: Dispatch<SetStateAction<string>>;
  setEmbeddedTestingOnlyJoins: Dispatch<SetStateAction<EmbeddedTestingOnlyJoin[]>>;
  setEmbeddedTestingOnlyRules: Dispatch<SetStateAction<EmbeddedTestingOnlyRuleForm[]>>;
  setPlatformFieldId: Dispatch<SetStateAction<string>>;
  setPlatformValueMap: Dispatch<SetStateAction<PlatformValueMapFormRow[]>>;
  setQaEngineerFieldId: Dispatch<SetStateAction<string>>;
  setQaEstimateFieldId: Dispatch<SetStateAction<string>>;
  setReleaseMrFieldId: Dispatch<SetStateAction<string>>;
  setReleaseReadyStatusKey: Dispatch<SetStateAction<string>>;
  testingFlowMode: "embedded" | "standalone";
  trackerStatusesList: TrackerStatusRowMeta[];
}) {
  const {
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
  } = options;

  useEffect(() => {
    if (fieldRows.length === 0) {
      return;
    }
    scheduleFormAutoDefault(() => {
      setReleaseMrFieldId((prev) =>
        prev ? toUiFieldValueFromStoredAccessor(fieldRows, prev) : prev,
      );
    });
  }, [fieldRows, setReleaseMrFieldId]);

  useEffect(() => {
    if (trackerStatusesList.length === 0 && fieldRows.length === 0) {
      return;
    }
    if (lastReleaseDefaultsForLoadNonceRef.current === integrationLoadNonce) {
      return;
    }
    scheduleFormAutoDefault(() => {
      setReleaseReadyStatusKey((k) => defaultReleaseReadyStatusKey(k, trackerStatusesList));
      setReleaseMrFieldId((id) => defaultReleaseMrFieldId(id, fieldRows));
      lastReleaseDefaultsForLoadNonceRef.current = integrationLoadNonce;
    });
  }, [
    fieldRows,
    integrationLoadNonce,
    lastReleaseDefaultsForLoadNonceRef,
    setReleaseMrFieldId,
    setReleaseReadyStatusKey,
    trackerStatusesList,
  ]);

  useEffect(() => {
    if (fieldRows.length === 0) {
      return;
    }

    const ids = new Set(fieldRows.map((f) => f.id));
    const normalized = (current: string, fallbackAlias: string) => {
      if (current && ids.has(current)) {
        return current;
      }
      const fallback = resolveFieldIdByAlias(fieldRows, fallbackAlias);
      return fallback && ids.has(fallback) ? fallback : "";
    };

    scheduleFormAutoDefault(() => {
      if (testingFlowMode === "embedded") {
        setDevEstimateFieldId((prev) => normalized(prev, "storyPoints"));
        setQaEstimateFieldId((prev) => normalized(prev, "testPoints"));
        setQaEngineerFieldId((prev) => normalized(prev, "qaEngineer"));
        setDevAssigneeFieldId((prev) => normalized(prev, "assignee"));
        return;
      }

      setDevEstimateFieldId((prev) => normalized(prev, "storyPoints"));
      setDevAssigneeFieldId((prev) => normalized(prev, "assignee"));
    });
  }, [
    fieldRows,
    setDevAssigneeFieldId,
    setDevEstimateFieldId,
    setQaEngineerFieldId,
    setQaEstimateFieldId,
    testingFlowMode,
    revision,
  ]);

  useEffect(() => {
    const snap = initialIntegrationSnapshotRef.current;
    if (snap === null) {
      return;
    }
    if (snap.hadPlatformField) {
      return;
    }
    if (fieldRows.length === 0) {
      return;
    }
    const ftId = findFunctionalTeamFieldId(fieldRows);
    if (!ftId) {
      return;
    }
    scheduleFormAutoDefault(() => {
      setPlatformFieldId((cur) => (cur.trim() ? cur : ftId));
    });
  }, [fieldRows, initialIntegrationSnapshotRef, revision, setPlatformFieldId]);

  useEffect(() => {
    const snap = initialIntegrationSnapshotRef.current;
    if (snap === null || snap.hadPlatformMap) {
      return;
    }
    if (!platformFieldId.trim() || platformFieldValues.length === 0) {
      return;
    }
    scheduleFormAutoDefault(() => {
      setPlatformValueMap((prev) => {
        if (prev.length > 0) {
          return prev;
        }
        const auto = buildAutoPlatformValueMap(platformFieldValues);
        return auto.length > 0 ? auto : prev;
      });
    });
  }, [
    initialIntegrationSnapshotRef,
    platformFieldId,
    platformFieldValues,
    revision,
    setPlatformValueMap,
  ]);

  useEffect(() => {
    const snap = readEmbeddedTestingSnapshot(initialIntegrationSnapshotRef);
    if (shouldSkipEmbeddedTestingAutoDefaults(snap, testingFlowMode, fieldRows.length)) {
      return;
    }
    const update = buildEmbeddedTestingAutoDefaultsUpdate(
      fieldRows,
      platformValueMap,
      platformFieldValues,
      embeddedTestingOnlyRules,
      embeddedTestingOnlyJoins,
    );
    if (!update) {
      return;
    }
    scheduleFormAutoDefault(() => {
      setEmbeddedTestingOnlyRules(update.desiredRules);
      setEmbeddedTestingOnlyJoins(update.desiredJoins);
    });
  }, [
    embeddedTestingOnlyJoins,
    embeddedTestingOnlyRules,
    fieldRows,
    initialIntegrationSnapshotRef,
    platformFieldValues,
    platformValueMap,
    revision,
    setEmbeddedTestingOnlyJoins,
    setEmbeddedTestingOnlyRules,
    testingFlowMode,
  ]);

  useEffect(() => {
    if (testingFlowMode !== "standalone") {
      return;
    }
    const snap = initialIntegrationSnapshotRef.current;
    if (snap === null || snap.hadEmbeddedTestingOnlyExtraRules) {
      return;
    }
    scheduleFormAutoDefault(() => {
      setEmbeddedTestingOnlyRules([]);
      setEmbeddedTestingOnlyJoins([]);
    });
  }, [
    initialIntegrationSnapshotRef,
    setEmbeddedTestingOnlyJoins,
    setEmbeddedTestingOnlyRules,
    testingFlowMode,
    revision,
  ]);
}
