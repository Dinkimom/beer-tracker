import { describe, expect, it } from "vitest";

import {
  mergeFormIntoConfig,
  pickEmbeddedTestingOnlyForm,
  resolveMergeRequestFieldId,
} from "./trackerIntegrationFormModel";

type ConfigForm = Parameters<typeof mergeFormIntoConfig>[1];

function baseForm(overrides: Partial<ConfigForm> = {}): ConfigForm {
  return {
    devAssigneeFieldId: "",
    devEstimateFieldId: "",
    embeddedTestingOnlyJoins: [],
    embeddedTestingOnlyRules: [],
    minSp: "",
    minTp: "",
    platformFieldId: "",
    platformValueMap: [],
    qaEngineerFieldId: "",
    qaEstimateFieldId: "",
    releaseMrFieldId: "",
    releaseReadyStatusKey: "",
    statusPaletteByKey: {},
    testingFlowMode: "embedded",
    zeroDevPositiveQa: false,
    ...overrides,
  };
}

describe("pickEmbeddedTestingOnlyForm", () => {
  it("reads stored operator rules and normalizes missing joins", () => {
    const form = pickEmbeddedTestingOnlyForm({
      testingFlow: {
        embeddedTestingOnlyJoins: ["or"],
        embeddedTestingOnlyRules: [
          { fieldId: "qa", operator: "gt", value: "0" },
          { fieldId: "dev", operator: "eq", value: "1" },
          { fieldId: "", operator: "eq", value: "ignored" },
        ],
      },
    });

    expect(form.rules).toEqual([
      { fieldId: "qa", operator: "gt", value: "0" },
      { fieldId: "dev", operator: "eq", value: "1" },
    ]);
    expect(form.joins).toEqual(["or"]);
  });

  it("converts legacy value lists into eq rules with and/or joins", () => {
    const form = pickEmbeddedTestingOnlyForm({
      testingFlow: {
        embeddedTestingOnlyRules: [
          { fieldId: "platform", values: [" Web ", "QA"] },
          { fieldId: "team", values: ["Backend"] },
        ],
      },
    });

    expect(form.rules).toEqual([
      { fieldId: "platform", operator: "eq", value: "Web" },
      { fieldId: "platform", operator: "eq", value: "QA" },
      { fieldId: "team", operator: "eq", value: "Backend" },
    ]);
    expect(form.joins).toEqual(["or", "and"]);
  });
});

describe("mergeFormIntoConfig", () => {
  it("merges form sections and trims empty legacy config", () => {
    const merged = mergeFormIntoConfig(
      {
        platform: { fieldId: "old", source: "field", valueMap: [] },
        testingFlow: { devAssigneeFieldId: "old", embeddedTestingOnlyJoins: ["or"] },
      },
      baseForm({
        devAssigneeFieldId: " dev ",
        embeddedTestingOnlyJoins: ["or"],
        embeddedTestingOnlyRules: [
          { fieldId: " qa ", operator: "gt", value: " 0 " },
          { fieldId: " flag ", operator: "eq", value: " yes " },
        ],
        minSp: "2",
        minTp: "3",
        platformFieldId: "platform-field",
        platformValueMap: [{ platform: "Web", trackerValue: " web " }],
        releaseMrFieldId: "mr-field-id",
        releaseReadyStatusKey: " ready ",
        statusPaletteByKey: { done: "green", empty: "" },
        testingFlowMode: "standalone",
        zeroDevPositiveQa: true,
      }),
      [{ id: "mr-field-id", key: "mrKey" }]
    );

    expect(merged.platform).toEqual({
      fieldId: "platform-field",
      source: "field",
      valueMap: [{ platform: "Web", trackerValue: "web" }],
    });
    expect(merged.testingFlow).toMatchObject({
      devAssigneeFieldId: "dev",
      embeddedTestingOnlyJoins: ["or"],
      embeddedTestingOnlyRules: [
        { fieldId: "qa", operator: "gt", value: "0" },
        { fieldId: "flag", operator: "eq", value: "yes" },
      ],
      mode: "standalone_qa_tasks",
      zeroDevPositiveQaRule: true,
    });
    expect(merged.statuses).toEqual({
      overridesByStatusKey: { done: { visualToken: "green" } },
    });
    expect(merged.validationThresholds).toEqual({
      occupancy: {
        minStoryPointsForAssignee: 2,
        minTestPointsForAssignee: 3,
      },
    });
    expect(merged.releaseReadiness).toEqual({
      mergeRequestFieldId: "mrKey",
      readyStatusKey: "ready",
    });
  });
});

describe("resolveMergeRequestFieldId", () => {
  it("prefers the Yandex MergeRequestLink field", () => {
    expect(
      resolveMergeRequestFieldId([
        { id: "summary", name: "Summary" },
        { id: "MergeRequestLink", key: "MergeRequestLink", name: "Merge Request" },
      ])
    ).toBe("MergeRequestLink");
  });

  it("matches a Jira custom field by display name", () => {
    expect(
      resolveMergeRequestFieldId([
        { display: "Merge Request URL", id: "customfield_10200", name: "Merge Request URL" },
      ])
    ).toBe("customfield_10200");
  });
});
