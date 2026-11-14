/**
 * Ленивое обновление staff.avatar_url из Jira при загрузке планера.
 * Сверка — по каждому сотруднику отдельно: новый человек проверяется сразу,
 * остальные — раз в TTL. Ответ ждёт Jira не дольше таймаута, запись в staff
 * доезжает в фоне. Яндекс Трекер не трогаем (аватары не отдаёт).
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

/** Как часто перепроверять аватар уже сверенного сотрудника. */
const AVATAR_CHECK_TTL_SEC = 30 * 60;
/** Jira не отдала аватар (ошибка, нет доступа) — повтор не раньше. */
const AVATAR_MISS_RETRY_TTL_SEC = 5 * 60;
/** Сколько ответ API ждёт Jira; остальное дописывается в staff в фоне. */
const AVATAR_RESPONSE_WAIT_MS = 2500;
const AVATAR_FETCH_CONCURRENCY = 6;

function avatarCheckKey(organizationId: string, m: TeamMember): string {
  return cacheKeys.jiraStaffAvatarCheck(organizationId, m.uid, m.tracker_uid?.trim() ?? '');
}

/** С привязкой к трекеру и без свежей сверки (новые — всегда). */
function membersDueForAvatarCheck(organizationId: string, members: TeamMember[]): TeamMember[] {
  return members.filter(
    (m) =>
      Boolean(m.tracker_uid?.trim()) &&
      Boolean(m.uid?.trim()) &&
      !apiCache.get<true>(avatarCheckKey(organizationId, m))
  );
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

async function checkMemberAvatar(
  organizationId: string,
  kind: JiraProviderKind,
  api: AxiosInstance,
  m: TeamMember,
  collected: Map<string, string>
): Promise<void> {
  const avatarUrl = await fetchJiraUserAvatarUrl(api, m.tracker_uid!.trim(), kind);
  if (!avatarUrl) {
    apiCache.set(avatarCheckKey(organizationId, m), true, AVATAR_MISS_RETRY_TTL_SEC);
    return;
  }
  collected.set(m.uid, avatarUrl);
  if (avatarUrl === (m.avatarUrl ?? null)) {
    return;
  }
  try {
    await updateStaff(organizationId, m.uid, { avatar_url: avatarUrl });
  } catch (e) {
    console.warn('[enrichPlannerTeamMembersAvatarsFromJira] staff write failed:', e);
  }
}

/** Сверяет аватары due-сотрудников пулом запросов; результаты копит в `collected`. */
async function refreshDueAvatars(
  organizationId: string,
  tracker: JiraOrganizationTracker,
  due: TeamMember[],
  collected: Map<string, string>
): Promise<void> {
  const api = await createJiraAxiosForOrganization(organizationId, tracker);
  if (!api) {
    apiCache.set(
      cacheKeys.jiraStaffAvatarsUnavailable(organizationId),
      true,
      AVATAR_MISS_RETRY_TTL_SEC
    );
    return;
  }
  // Ставим gate заранее: параллельные запросы планера не дублируют GET /user.
  for (const m of due) {
    apiCache.set(avatarCheckKey(organizationId, m), true, AVATAR_CHECK_TTL_SEC);
  }
  const queue = [...due];
  const worker = async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      await checkMemberAvatar(organizationId, tracker.kind, api, m, collected);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(AVATAR_FETCH_CONCURRENCY, queue.length) }, worker)
  );
}

async function waitAtMost(promise: Promise<void>, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
    }),
  ]);
  clearTimeout(timer);
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
 * Для Jira: сверяет avatar_url сотрудников без свежей проверки (новых — сразу,
 * остальных — раз в TTL), пишет в staff и подмешивает в ответ планера.
 * Не-Jira / пустой состав / все сверены — no-op.
 */
export async function enrichPlannerTeamMembersAvatarsFromJira(
  organizationId: string,
  members: TeamMember[]
): Promise<TeamMember[]> {
  const due = membersDueForAvatarCheck(organizationId, members);
  if (due.length === 0) {
    return members;
  }
  const unavailableKey = cacheKeys.jiraStaffAvatarsUnavailable(organizationId);
  if (apiCache.get<true>(unavailableKey)) {
    return members;
  }

  const tracker = await readJiraOrganizationTracker(organizationId);
  if (!tracker) {
    apiCache.set(unavailableKey, true, AVATAR_CHECK_TTL_SEC);
    return members;
  }

  const collected = new Map<string, string>();
  const refresh = refreshDueAvatars(organizationId, tracker, due, collected).catch((e) => {
    console.warn('[enrichPlannerTeamMembersAvatarsFromJira] refresh failed:', e);
  });
  await waitAtMost(refresh, AVATAR_RESPONSE_WAIT_MS);
  return applyAvatarMap(members, new Map(collected));
}
