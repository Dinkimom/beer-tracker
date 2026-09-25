import type { TrackerIssue } from "@/types/tracker";

import { describe, expect, it } from "vitest";

import { readStringTokensFromIssue } from "./issueFieldUtils";

function issueWith(fields: Record<string, unknown>): TrackerIssue {
  return fields as unknown as TrackerIssue;
}

describe("readStringTokensFromIssue", () => {
  it("collects key, display and id tokens from object fields without duplicates", () => {
    const issue = issueWith({
      platform: {
        display: "Web",
        id: "web-id",
        key: "web",
      },
    });

    expect(readStringTokensFromIssue(issue, "platform")).toEqual(["web", "Web", "web-id"]);
  });

  it("collects tokens from array string and object values", () => {
    const issue = issueWith({
      teams: [
        "Backend",
        { display: "Quality Assurance", id: "qa-id", key: "qa" },
        { display: "Backend", id: "be-id" },
      ],
    });

    const tokens = readStringTokensFromIssue(issue, "teams");
    expect(tokens).toEqual(expect.arrayContaining([
      "Backend",
      "qa",
      "Quality Assurance",
      "qa-id",
      "be-id",
    ]));
  });

  it("collects Jira component names", () => {
    const issue = issueWith({
      components: [{ id: "10036", name: "Frontend" }],
    });

    expect(readStringTokensFromIssue(issue, "components")).toEqual(["Frontend", "10036"]);
  });
});
