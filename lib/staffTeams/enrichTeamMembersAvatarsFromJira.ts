/**
 * Ленивое обновление staff.avatar_url из Jira при загрузке планера.
 * Пока жив apiCache — Jira не дергаем; TTL истёк — GET /user, пишем в staff.
 * Яндекс Трекер не трогаем (аватары не отдаёт).
 */

import type { TeamMember } from '@/types/team';
import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '@/lib/cache';
import { getIssueTrackerProviderKind } from '@/lib/env';
import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import {
  jiraCloudRequiresBasicAuthEmail,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import { fetchJiraUserAvatarUrl } from '@/lib/issueTrackerProvider/jiraUserAvatar';
import { readIssueTrackerBasicAuthEmail } from '@/lib/issueTrackerProvider/settings';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { JIRA_EXTERNAL_ORG_ID_FALLBACK } from '@/lib/issueTrackerProvider/types';
import { findOrganizationById, getDecryptedOrganizationTrackerToken } from '@/lib/organizations';
import { updateStaff } from '@/lib/staffTeams/staffRepository';
import { resolveTrackerApiBaseUrlForOrganizationRow } from '@/lib/trackerRequestConfig';

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

async function createJiraAxiosForOrganization(
  organizationId: string
): Promise<{ api: AxiosInstance; kind: ReturnType<typeof getIssueTrackerProviderKind> } | null> {
  const kind = getIssueTrackerProviderKind();
  if (!isJiraProviderKind(kind)) {
    return null;
  }

  const org = await findOrganizationById(organizationId);
  if (!org) {
    return null;
  }

  let token: string;
  try {
    const t = await getDecryptedOrganizationTrackerToken(organizationId);
    if (!t?.trim()) {
      return null;
    }
    token = t.trim();
  } catch {
    return null;
  }

  const jiraEmail = readIssueTrackerBasicAuthEmail(org.settings);
  if (jiraCloudRequiresBasicAuthEmail(kind) && !jiraEmail) {
    return null;
  }

  return {
    api: createIssueTrackerAxiosForCredentials({
      apiUrl: resolveTrackerApiBaseUrlForOrganizationRow(org),
      jiraEmail,
      oauthToken: token,
      orgId: JIRA_EXTERNAL_ORG_ID_FALLBACK,
    }),
    kind,
  };
}

async function fetchAvatarUrlsFromJira(
  organizationId: string,
  members: TeamMember[]
): Promise<Map<string, string> | null> {
  const client = await createJiraAxiosForOrganization(organizationId);
  if (!client) {
    return null;
  }

  const targets = membersNeedingTrackerLookup(members);
  if (targets.length === 0) {
    return new Map();
  }

  const settled = await Promise.allSettled(
    targets.map(async (m) => {
      const trackerId = m.tracker_uid!.trim();
      const avatarUrl = await fetchJiraUserAvatarUrl(client.api, trackerId, client.kind);
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
  members: TeamMember[]
): Promise<Map<string, string> | null> {
  try {
    const byStaffId = await withTimeout(
      fetchAvatarUrlsFromJira(organizationId, members),
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
  if (members.length === 0 || !isJiraProviderKind(getIssueTrackerProviderKind())) {
    return members;
  }
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

  const loadPromise = refreshJiraAvatarsUncached(organizationId, members).then((byStaffId) => {
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
