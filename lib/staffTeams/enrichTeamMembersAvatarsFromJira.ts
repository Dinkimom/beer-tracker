/**
 * Ленивое обновление staff.avatar_url из Jira при загрузке планера.
 * Пока жив apiCache — Jira не дергаем; TTL истёк — GET /user, пишем в staff.
 * Яндекс Трекер не трогаем (аватары не отдаёт).
 */

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { TeamMember } from '@/types/team';
import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '@/lib/cache';
import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import { fetchJiraUserAvatarUrl } from '@/lib/issueTrackerProvider/jiraUserAvatar';
import {
  readIssueTrackerBasicAuthEmail,
  readIssueTrackerCloudId,
  readOrganizationIssueTrackerConfig,
} from '@/lib/issueTrackerProvider/settings';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { JIRA_EXTERNAL_ORG_ID_FALLBACK } from '@/lib/issueTrackerProvider/types';
import { findOrganizationById } from '@/lib/organizations';
import {
  getOrganizationTrackerCredentials,
  organizationTrackerClientAuth,
  type OrganizationTrackerCredentials,
} from '@/lib/organizations/organizationTrackerCredentials';
import { updateStaff } from '@/lib/staffTeams/staffRepository';

type JiraProviderKind = Extract<IssueTrackerProviderKind, 'jira-cloud' | 'jira-onprem'>;

const JIRA_AVATAR_REFRESH_TTL_SEC = 30 * 60;
const JIRA_AVATAR_REFRESH_TIMEOUT_MS = 2500;
const inFlightAvatarRefreshes = new Map<string, Promise<Map<string, string> | null>>();

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

function membersNeedingTrackerLookup(members: TeamMember[]): TeamMember[] {
  return members.filter((m) => Boolean(m.tracker_uid?.trim()) && Boolean(m.uid?.trim()));
}

interface JiraOrganizationTracker {
  apiUrl: string;
  cloudId: string;
  jiraEmail: string;
  kind: JiraProviderKind;
}

async function readJiraOrganizationTracker(
  organizationId: string
): Promise<JiraOrganizationTracker | null> {
  const org = await findOrganizationById(organizationId);
  const tracker = org ? readOrganizationIssueTrackerConfig(org.settings) : null;
  if (!org || !tracker || !isJiraProviderKind(tracker.kind)) {
    return null;
  }
  return {
    apiUrl: tracker.apiUrl,
    cloudId: readIssueTrackerCloudId(org.settings),
    jiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
    kind: tracker.kind,
  };
}

async function createJiraAxiosForOrganization(
  organizationId: string,
  tracker: JiraOrganizationTracker
): Promise<AxiosInstance | null> {
  let credentials: OrganizationTrackerCredentials | null;
  try {
    credentials = await getOrganizationTrackerCredentials(organizationId);
  } catch {
    return null;
  }
  const token = credentials?.accessToken.trim();
  if (!credentials || !token) {
    return null;
  }
  const auth = organizationTrackerClientAuth({ ...tracker, credentials });
  return createIssueTrackerAxiosForCredentials({
    apiUrl: auth.apiUrl,
    jiraEmail: auth.jiraEmail,
    oauthToken: token,
    orgId: JIRA_EXTERNAL_ORG_ID_FALLBACK,
    providerKind: tracker.kind,
  });
}

async function fetchAvatarUrlsFromJira(
  organizationId: string,
  tracker: JiraOrganizationTracker,
  members: TeamMember[]
): Promise<Map<string, string> | null> {
  const api = await createJiraAxiosForOrganization(organizationId, tracker);
  if (!api) {
    return null;
  }

  const targets = membersNeedingTrackerLookup(members);
  if (targets.length === 0) {
    return new Map();
  }

  const settled = await Promise.allSettled(
    targets.map(async (m) => {
      const trackerId = m.tracker_uid!.trim();
      const avatarUrl = await fetchJiraUserAvatarUrl(api, trackerId, tracker.kind);
      return { staffId: m.uid, avatarUrl };
    })
  );

  const byStaffId = new Map<string, string>();
  for (const result of settled) {
    if (result.status !== 'fulfilled') {
      continue;
    }
    const { staffId, avatarUrl } = result.value;
    if (avatarUrl) {
      byStaffId.set(staffId, avatarUrl);
    }
  }
  return byStaffId;
}

async function persistAvatarUrls(
  organizationId: string,
  members: TeamMember[],
  byStaffId: Map<string, string>
): Promise<void> {
  const writes: Promise<unknown>[] = [];
  for (const m of members) {
    const next = byStaffId.get(m.uid);
    if (!next || next === (m.avatarUrl ?? null)) {
      continue;
    }
    writes.push(updateStaff(organizationId, m.uid, { avatar_url: next }));
  }
  if (writes.length === 0) {
    return;
  }
  await Promise.allSettled(writes);
}

async function refreshJiraAvatarsUncached(
  organizationId: string,
  tracker: JiraOrganizationTracker,
  members: TeamMember[]
): Promise<Map<string, string> | null> {
  try {
    const byStaffId = await withTimeout(
      fetchAvatarUrlsFromJira(organizationId, tracker, members),
      JIRA_AVATAR_REFRESH_TIMEOUT_MS
    );
    if (!byStaffId) {
      return null;
    }
    await persistAvatarUrls(organizationId, members, byStaffId);
    return byStaffId;
  } catch (e) {
    console.warn('[enrichPlannerTeamMembersAvatarsFromJira] refresh failed:', e);
    return null;
  }
}

function applyAvatarMap(members: TeamMember[], byStaffId: Map<string, string>): TeamMember[] {
  if (byStaffId.size === 0) {
    return members;
  }
  return members.map((m) => {
    const next = byStaffId.get(m.uid);
    if (!next || next === m.avatarUrl) {
      return m;
    }
    return { ...m, avatarUrl: next };
  });
}

/**
 * Для Jira: раз в TTL обновляет avatar_url в staff и подмешивает в ответ планера.
 * Не-Jira / пустой состав / живой кэш — no-op.
 */
export async function enrichPlannerTeamMembersAvatarsFromJira(
  organizationId: string,
  members: TeamMember[]
): Promise<TeamMember[]> {
  if (membersNeedingTrackerLookup(members).length === 0) {
    return members;
  }

  const cacheKey = cacheKeys.jiraStaffAvatarsRefresh(organizationId);
  if (apiCache.get<true>(cacheKey)) {
    return members;
  }

  const inFlight = inFlightAvatarRefreshes.get(cacheKey);
  if (inFlight) {
    const byStaffId = await inFlight;
    return byStaffId ? applyAvatarMap(members, byStaffId) : members;
  }

  const tracker = await readJiraOrganizationTracker(organizationId);
  if (!tracker) {
    apiCache.set(cacheKey, true, JIRA_AVATAR_REFRESH_TTL_SEC);
    return members;
  }

  const loadPromise = refreshJiraAvatarsUncached(organizationId, tracker, members).then((byStaffId) => {
    if (byStaffId) {
      apiCache.set(cacheKey, true, JIRA_AVATAR_REFRESH_TTL_SEC);
    }
    return byStaffId;
  }).finally(() => {
    inFlightAvatarRefreshes.delete(cacheKey);
  });

  inFlightAvatarRefreshes.set(cacheKey, loadPromise);
  const byStaffId = await loadPromise;
  return byStaffId ? applyAvatarMap(members, byStaffId) : members;
}
