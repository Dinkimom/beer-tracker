import type { PlatformValueMapFormRow } from "./types";

import { canonicalPaletteKey } from "@/utils/statusColors";

const VALID_PLATFORMS = new Set(["Back", "Web", "QA", "DevOps"]);

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

export function parsePlatformValueMapRow(row: unknown): PlatformValueMapFormRow | null {
  const r = asRecord(row);
  const trackerValue =
    typeof r?.trackerValue === "string" ? r.trackerValue.trim() : "";
  const platform = r?.platform;
  if (
    trackerValue &&
    typeof platform === "string" &&
    VALID_PLATFORMS.has(platform)
  ) {
    return { platform: platform as PlatformValueMapFormRow["platform"], trackerValue };
  }
  return null;
}

export function parseStatusPaletteOverrideEntry(
  key: string,
  raw: unknown,
): [string, string] | null {
  const r = asRecord(raw);
  const palette =
    typeof r?.visualToken === "string" ? r.visualToken.trim() : "";
  if (palette) {
    return [key, canonicalPaletteKey(palette)];
  }
  return null;
}

export function dedupeAdminMetaLabelParts(
  parts: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = (p ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
