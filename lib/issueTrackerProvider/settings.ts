import type { IssueTrackerProviderKind } from './types';

import { z } from 'zod';

import { cleanJiraBasicAuthEmail } from './jiraBasicAuthEmail';
import { parseIssueTrackerProviderKind } from './providerKind';
import {
  DEFAULT_ISSUE_TRACKER_PROVIDER_KIND,
  ISSUE_TRACKER_PROVIDER_KINDS,
} from './types';

const IssueTrackerProviderKindSchema = z.preprocess((raw) => {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_ISSUE_TRACKER_PROVIDER_KIND;
  }
  if (typeof raw !== 'string') {
    return raw;
  }
  return parseIssueTrackerProviderKind(raw, process.env.TRACKER_API_URL ?? '') ?? raw;
}, z.enum(ISSUE_TRACKER_PROVIDER_KINDS));

const IssueTrackerSettingsSchema = z
  .object({
    /** Email Atlassian-аккаунта org-токена (Jira Cloud Basic). Не секрет. */
    basicAuthEmail: z.string().optional(),
    provider: IssueTrackerProviderKindSchema.default(DEFAULT_ISSUE_TRACKER_PROVIDER_KIND),
  })
  .strict();

type IssueTrackerSettings = z.infer<typeof IssueTrackerSettingsSchema>;

function extractIssueTrackerSettingsJson(settingsRoot: unknown): unknown {
  if (settingsRoot === null || settingsRoot === undefined) {
    return {};
  }
  if (typeof settingsRoot !== 'object' || Array.isArray(settingsRoot)) {
    return {};
  }
  const raw = (settingsRoot as Record<string, unknown>).issueTracker;
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return raw;
  }
  return raw;
}

export function parseIssueTrackerSettings(raw: unknown): IssueTrackerSettings {
  const result = IssueTrackerSettingsSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid issue tracker settings: ${result.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return result.data;
}

export function resolveIssueTrackerProviderKindFromSettingsRoot(
  settingsRoot: unknown
): IssueTrackerProviderKind {
  return parseIssueTrackerSettings(extractIssueTrackerSettingsJson(settingsRoot)).provider;
}

export function readIssueTrackerBasicAuthEmail(settingsRoot: unknown): string {
  return cleanJiraBasicAuthEmail(
    parseIssueTrackerSettings(extractIssueTrackerSettingsJson(settingsRoot)).basicAuthEmail
  );
}

export function mergeOrganizationSettingsIssueTrackerPatch(
  settingsRoot: unknown,
  patch: Partial<IssueTrackerSettings>
): Record<string, unknown> {
  const root =
    settingsRoot !== null && typeof settingsRoot === 'object' && !Array.isArray(settingsRoot)
      ? { ...(settingsRoot as Record<string, unknown>) }
      : {};
  const current = parseIssueTrackerSettings(extractIssueTrackerSettingsJson(root));
  const next = parseIssueTrackerSettings({ ...current, ...patch });
  root.issueTracker = next;
  return root;
}
