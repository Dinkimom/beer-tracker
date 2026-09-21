/**
 * Резолв Cloud Organization ID и URL API трекера для запроса планера:
 * только при сессии продукта + {@link TENANT_ORG_HEADER} — из external org id организации
 * (DB: `organizations.tracker_org_id`) и env `TRACKER_API_URL`.
 */

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { OrganizationRow } from '@/lib/organizations/types';

import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { query } from '@/lib/db';
import { getIssueTrackerProviderKind, getTrackerConfig } from '@/lib/env';
import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import {
  JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
  jiraCloudRequiresBasicAuthEmail,
  jiraEmailFromRequest,
  resolveJiraBasicAuthEmail,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import { readIssueTrackerBasicAuthEmail } from '@/lib/issueTrackerProvider/settings';
import { readIssueTrackerExternalOrgId } from '@/lib/issueTrackerProvider/storageAliases';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { JIRA_EXTERNAL_ORG_ID_FALLBACK } from '@/lib/issueTrackerProvider/types';
import { DEFAULT_ISSUE_TRACKER_PROVIDER_KIND } from '@/lib/issueTrackerProvider/types';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import { findOrganizationById } from '@/lib/organizations/organizationRepository';
import { getDecryptedOrganizationTrackerToken } from '@/lib/organizations/organizationSecretsRepository';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import { normalizeTrackerApiBaseUrl } from '@/lib/trackerCredentialsValidation';

interface TrackerCloudContext {
  apiUrl: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
  storedJiraEmail: string;
}

interface TrackerApiResolvedConfig extends TrackerCloudContext {
  jiraEmail: string;
  oauthToken: string;
}

function cleanTrackerTokenFromRequest(request: Request): string {
  const raw = request.headers.get('x-tracker-token') || '';
  return raw.replace(/\s+/g, '').trim();
}

function withJiraEmail(
  request: Request | null,
  ctx: TrackerCloudContext,
  oauthToken: string,
  requestTokenPresent: boolean
): TrackerApiResolvedConfig {
  if (!isJiraProviderKind(ctx.providerKind)) {
    return { ...ctx, jiraEmail: '', oauthToken };
  }
  const jiraEmail = resolveJiraBasicAuthEmail({
    requestEmail: request ? jiraEmailFromRequest(request) : '',
    storedOrgEmail: ctx.storedJiraEmail,
    usingRequestToken: requestTokenPresent,
  });
  if (jiraCloudRequiresBasicAuthEmail(ctx.providerKind) && !jiraEmail) {
    throw new TrackerApiConfigError(JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE, 400);
  }
  return { ...ctx, jiraEmail, oauthToken };
}

export class TrackerApiConfigError extends Error {
  override readonly name = 'TrackerApiConfigError';

  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function resolveTrackerApiBaseUrlForOrganizationRow(_org: OrganizationRow): string {
  const envUrl = getTrackerConfig().apiUrl?.trim();
  if (envUrl) {
    try {
      return normalizeTrackerApiBaseUrl(envUrl);
    } catch {
      /* fall through */
    }
  }
  return 'https://api.tracker.yandex.net/v3';
}

function assertYandexTrackerProvider(
  providerKind: IssueTrackerProviderKind
): asserts providerKind is typeof DEFAULT_ISSUE_TRACKER_PROVIDER_KIND {
  if (providerKind === 'tracker') {
    return;
  }
  throw new TrackerApiConfigError(
    `Инстанс настроен на ${providerKind}, но этот маршрут пока поддерживает только Яндекс Трекер.`,
    422
  );
}

function issueTrackerCloudContextForOrganizationRow(
  org: OrganizationRow
): TrackerCloudContext {
  const providerKind = getIssueTrackerProviderKind();
  const apiUrl = resolveTrackerApiBaseUrlForOrganizationRow(org);
  const externalOrgId = readIssueTrackerExternalOrgId(org);

  if (isJiraProviderKind(providerKind)) {
    return {
      apiUrl,
      orgId: externalOrgId || JIRA_EXTERNAL_ORG_ID_FALLBACK,
      providerKind,
      storedJiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
    };
  }

  assertYandexTrackerProvider(providerKind);
  if (!externalOrgId) {
    throw new TrackerApiConfigError(
      'Для организации не настроен Яндекс Трекер. Откройте админку и подключите трекер.',
      422
    );
  }
  return {
    apiUrl,
    orgId: externalOrgId,
    providerKind,
    storedJiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
  };
}

async function trackerCloudContextForProductOrganization(
  userId: string,
  organizationId: string
): Promise<TrackerCloudContext> {
  const membership = await findOrganizationMembership(organizationId, userId);
  if (!membership) {
    throw new TrackerApiConfigError('Нет доступа к организации', 403);
  }
  const org = await findOrganizationById(organizationId);
  if (!org) {
    throw new TrackerApiConfigError('Организация не найдена', 404);
  }
  return issueTrackerCloudContextForOrganizationRow(org);
}

/**
 * Контекст API трекера по UUID организации продукта (без проверки членства пользователя).
 */
export async function resolveTrackerCloudContextForProductOrganizationId(
  organizationProductId: string
): Promise<TrackerCloudContext> {
  const org = await findOrganizationById(organizationProductId);
  if (!org) {
    throw new TrackerApiConfigError('Организация не найдена', 404);
  }
  return issueTrackerCloudContextForOrganizationRow(org);
}

/**
 * Контекст API трекера по UUID организации продукта без сессии пользователя (только on-prem после инициализации).
 */
export async function resolveTrackerCloudContextForProductOrganizationIdOnPrem(
  organizationProductId: string
): Promise<TrackerCloudContext> {
  const setup = await readOnPremSetupState();
  if (!setup.hasOrganizations) {
    throw new TrackerApiConfigError('Завершите первичную настройку.', 403);
  }
  return resolveTrackerCloudContextForProductOrganizationId(organizationProductId);
}

export async function resolveDefaultOnPremOrganizationId(): Promise<string> {
  const setup = await readOnPremSetupState();
  if (!setup.hasOrganizations) {
    throw new TrackerApiConfigError('Завершите первичную настройку.', 403);
  }
  const res = await query<{ id: string }>(
    `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`
  );
  const organizationId = res.rows[0]?.id?.trim();
  if (!organizationId) {
    throw new TrackerApiConfigError('Организация не найдена', 404);
  }
  return organizationId;
}

/**
 * OAuth-токен и cloud org id трекера для организации продукта (заголовок или org-токен on-prem).
 */
async function resolveTrackerApiConfigForOrganization(
  request: Request,
  organizationProductId: string
): Promise<TrackerApiResolvedConfig> {
  const oauthToken = cleanTrackerTokenFromRequest(request);
  const ctx = await resolveTrackerCloudContextForProductOrganizationIdOnPrem(organizationProductId);
  const token = await resolveOauthTokenOrThrow(organizationProductId, oauthToken, 422);
  return withJiraEmail(request, ctx, token, Boolean(oauthToken));
}

/** Проверяет OAuth-токен трекера запросом GET /myself в контексте организации продукта. */
export async function verifyTrackerAccessForOrganization(
  request: Request,
  organizationProductId: string
): Promise<void> {
  const { apiUrl, jiraEmail, oauthToken, orgId } = await resolveTrackerApiConfigForOrganization(
    request,
    organizationProductId
  );
  const trackerApi = createIssueTrackerAxiosForCredentials({
    apiUrl,
    jiraEmail,
    oauthToken,
    orgId,
  });
  try {
    await trackerApi.get('/myself');
  } catch {
    throw new TrackerApiConfigError('Недействительный токен трекера.', 401);
  }
}

/**
 * Токен и URL API трекера из настроек организации (без X-Tracker-Token).
 * Для админских маршрутов, где мастер-данные пользователей в трекере.
 */
export async function resolveStoredOrganizationTrackerApiConfig(
  organizationProductId: string
): Promise<TrackerApiResolvedConfig> {
  const ctx = await resolveTrackerCloudContextForProductOrganizationId(organizationProductId);
  const storedToken = await getDecryptedOrganizationTrackerToken(organizationProductId);
  const token = storedToken?.replace(/\s+/g, '').trim() ?? '';
  if (!token) {
    throw new TrackerApiConfigError(
      'Нет токена трекера. Сохраните токен во вкладке подключения трекера.',
      422
    );
  }
  return withJiraEmail(null, ctx, token, false);
}

/** Токен из `X-Tracker-Token` или сохранённый токен организации. */
async function resolveOauthTokenOrThrow(
  organizationProductId: string,
  oauthToken: string,
  missingStatus: 401 | 422
): Promise<string> {
  if (oauthToken) {
    return oauthToken;
  }
  const storedToken = await getDecryptedOrganizationTrackerToken(organizationProductId);
  const resolved = storedToken?.replace(/\s+/g, '').trim() ?? '';
  if (resolved) {
    return resolved;
  }
  throw new TrackerApiConfigError(
    'Не найден токен Tracker: добавьте X-Tracker-Token или сохраните токен в настройках организации.',
    missingStatus
  );
}

async function resolveAuthedOrganizationTrackerApiConfig(
  request: Request,
  userId: string,
  organizationProductId: string,
  oauthToken: string
): Promise<TrackerApiResolvedConfig> {
  const ctx = await trackerCloudContextForProductOrganization(userId, organizationProductId);
  const token = await resolveOauthTokenOrThrow(organizationProductId, oauthToken, 401);
  return withJiraEmail(request, ctx, token, Boolean(oauthToken));
}

async function resolveOnPremTrackerApiConfigFromRequest(
  request: Request,
  organizationIdFromHeader: string | null,
  oauthToken: string
): Promise<TrackerApiResolvedConfig> {
  const organizationId =
    organizationIdFromHeader ?? (await resolveDefaultOnPremOrganizationId());
  const resolvedToken = await resolveOauthTokenOrThrow(organizationId, oauthToken, 422);
  const ctx = await resolveTrackerCloudContextForProductOrganizationIdOnPrem(organizationId);
  return withJiraEmail(request, ctx, resolvedToken, Boolean(oauthToken));
}

export async function resolveTrackerApiConfigFromRequest(request: Request): Promise<{
  apiUrl: string;
  jiraEmail: string;
  oauthToken: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
}> {
  const oauthToken = cleanTrackerTokenFromRequest(request);
  const userId = getProductUserIdFromRequest(request);
  const organizationId = parseRegistryUuidString(request.headers.get(TENANT_ORG_HEADER));

  if (userId && organizationId) {
    return await resolveAuthedOrganizationTrackerApiConfig(
      request,
      userId,
      organizationId,
      oauthToken
    );
  }

  return await resolveOnPremTrackerApiConfigFromRequest(request, organizationId, oauthToken);
}

/**
 * Для POST /api/auth/validate-token: org из заголовка или тела.
 * Не требуем членство — на странице входа cookie может быть без орг.
 */
export function resolveValidateTokenTrackerContext(
  request: Request,
  bodyOrganizationId: unknown
): Promise<TrackerCloudContext> {
  const rawHeader = request.headers.get(TENANT_ORG_HEADER)?.trim();
  const rawBody = typeof bodyOrganizationId === 'string' ? bodyOrganizationId.trim() : '';
  const organizationId = parseRegistryUuidString(rawHeader || rawBody);

  if (!organizationId) {
    throw new TrackerApiConfigError(
      'Выберите организацию в приложении или укажите organizationId в теле запроса (UUID).',
      400
    );
  }

  return resolveTrackerCloudContextForProductOrganizationIdOnPrem(organizationId);
}
