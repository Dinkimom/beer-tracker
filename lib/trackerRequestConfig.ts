/**
 * Резолв трекера для запроса планера: тип, URL API и external org id — из настроек
 * организации (`organizations.settings.issueTracker`, `organizations.tracker_org_id`).
 */

import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { OrganizationIssueTrackerConfig } from '@/lib/issueTrackerProvider/settings';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { OrganizationRow } from '@/lib/organizations/types';

import { jiraCloudOAuthApiBaseUrl } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import { createIssueTrackerAxiosForCredentials } from '@/lib/issueTrackerProvider/createIssueTrackerAxios';
import { issueTrackerWebBaseFromApiUrl } from '@/lib/issueTrackerProvider/issueTrackerUi';
import {
  JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE,
  JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE,
  jiraCloudIdFromRequest,
  jiraCloudRequiresBasicAuthEmail,
} from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';
import {
  readIssueTrackerBasicAuthEmail,
  readIssueTrackerCloudId,
  readOrganizationIssueTrackerConfig,
} from '@/lib/issueTrackerProvider/settings';
import { readIssueTrackerExternalOrgId } from '@/lib/issueTrackerProvider/storageAliases';
import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';
import { JIRA_EXTERNAL_ORG_ID_FALLBACK } from '@/lib/issueTrackerProvider/types';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';
import { findOrganizationMembership } from '@/lib/organizations/organizationMembersRepository';
import {
  fetchFirstOrganizationId,
  findOrganizationById,
} from '@/lib/organizations/organizationRepository';
import { getOrganizationTrackerCredentials } from '@/lib/organizations/organizationTrackerCredentials';
import { parseRegistryUuidString } from '@/lib/registryUuidString';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';
import { normalizeTrackerApiBaseUrl } from '@/lib/trackerCredentialsValidation';

interface TrackerCloudContext {
  apiUrl: string;
  cloudId: string;
  orgId: string;
  providerKind: IssueTrackerProviderKind;
  storedJiraEmail: string;
  /** Browser base для ссылок на задачи (от URL сайта, не от OAuth-шлюза). */
  webBaseUrl: string;
}

interface TrackerApiResolvedConfig extends TrackerCloudContext {
  jiraEmail: string;
  oauthToken: string;
}

interface ResolvedTrackerToken {
  /** Jira Cloud OAuth 3LO (через шлюз по cloudId), а не API-токен с Basic. */
  oauthGateway: boolean;
  token: string;
}

function cleanTrackerTokenFromRequest(request: Request): string {
  const raw = request.headers.get('x-tracker-token') || '';
  return raw.replace(/\s+/g, '').trim();
}

function resolveJiraCloudApiUrl(cloudId: string, fallbackApiUrl: string): string {
  const id = cloudId.trim();
  if (!id) {
    return fallbackApiUrl;
  }
  return jiraCloudOAuthApiBaseUrl(id);
}

/**
 * Jira Cloud dual auth:
 * - OAuth token (user request token or org-stored OAuth pair) + cloudId → Bearer via api.atlassian.com/ex/jira/{cloudId}
 * - org-stored API token → Basic (email + token) against the org's stored site URL
 */
function withJiraCloudAuth(
  request: Request | null,
  ctx: TrackerCloudContext,
  { oauthGateway, token: oauthToken }: ResolvedTrackerToken
): TrackerApiResolvedConfig {
  if (ctx.providerKind !== 'jira-cloud') {
    return { ...ctx, jiraEmail: '', oauthToken };
  }

  if (oauthGateway) {
    const requestCloudId = request ? jiraCloudIdFromRequest(request) : '';
    const cloudId = requestCloudId || ctx.cloudId;
    if (!cloudId) {
      throw new TrackerApiConfigError(JIRA_CLOUD_OAUTH_CLOUD_ID_REQUIRED_MESSAGE, 400);
    }
    return {
      ...ctx,
      apiUrl: resolveJiraCloudApiUrl(cloudId, ctx.apiUrl),
      cloudId,
      jiraEmail: '',
      oauthToken,
    };
  }

  const jiraEmail = ctx.storedJiraEmail.trim();
  if (jiraCloudRequiresBasicAuthEmail(ctx.providerKind) && !jiraEmail) {
    throw new TrackerApiConfigError(JIRA_CLOUD_BASIC_AUTH_EMAIL_REQUIRED_MESSAGE, 400);
  }
  // Site REST URL from org settings (Basic); not the OAuth gateway.
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

const ORGANIZATION_TRACKER_NOT_CONFIGURED_MESSAGE =
  'Для организации не подключён трекер задач. Откройте админку и подключите трекер.';

/** Трекер организации из настроек; не выбран — 422 с подсказкой про админку. */
export function requireOrganizationIssueTrackerConfig(
  org: Pick<OrganizationRow, 'settings'>
): OrganizationIssueTrackerConfig {
  const config = readOrganizationIssueTrackerConfig(org.settings);
  if (!config) {
    throw new TrackerApiConfigError(ORGANIZATION_TRACKER_NOT_CONFIGURED_MESSAGE, 422);
  }
  let apiUrl: string;
  try {
    apiUrl = normalizeTrackerApiBaseUrl(config.apiUrl);
  } catch {
    throw new TrackerApiConfigError('Некорректный URL API трекера в настройках организации', 422);
  }
  return { apiUrl, kind: config.kind };
}

function issueTrackerCloudContextForOrganizationRow(
  org: OrganizationRow
): TrackerCloudContext {
  const { apiUrl, kind: providerKind } = requireOrganizationIssueTrackerConfig(org);
  const externalOrgId = readIssueTrackerExternalOrgId(org);
  const webBaseUrl = issueTrackerWebBaseFromApiUrl(providerKind, apiUrl);

  if (isJiraProviderKind(providerKind)) {
    return {
      // Keep site URL here; OAuth gateway is applied only for user Bearer tokens.
      apiUrl,
      cloudId: readIssueTrackerCloudId(org.settings),
      orgId: externalOrgId || JIRA_EXTERNAL_ORG_ID_FALLBACK,
      providerKind,
      storedJiraEmail: readIssueTrackerBasicAuthEmail(org.settings),
      webBaseUrl,
    };
  }

  if (!externalOrgId) {
    throw new TrackerApiConfigError(ORGANIZATION_TRACKER_NOT_CONFIGURED_MESSAGE, 422);
  }
  return {
    apiUrl,
    cloudId: '',
    orgId: externalOrgId,
    providerKind,
    storedJiraEmail: '',
    webBaseUrl,
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

/** Тип трекера и web-base для ссылок на задачи (маппинг снапшотов без клиента трекера). */
export async function resolveTrackerWebUrlContextForOrganizationId(
  organizationProductId: string
): Promise<TrackerWebUrlContext> {
  const org = await findOrganizationById(organizationProductId);
  if (!org) {
    throw new TrackerApiConfigError('Организация не найдена', 404);
  }
  const { apiUrl, kind } = requireOrganizationIssueTrackerConfig(org);
  return { kind, webBaseUrl: issueTrackerWebBaseFromApiUrl(kind, apiUrl) };
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
  const organizationId = (await fetchFirstOrganizationId())?.trim();
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
  return withJiraCloudAuth(request, ctx, token);
}

/** Проверяет OAuth-токен трекера запросом GET /myself в контексте организации продукта. */
export async function verifyTrackerAccessForOrganization(
  request: Request,
  organizationProductId: string
): Promise<void> {
  const trackerApi = createIssueTrackerAxiosForCredentials(
    await resolveTrackerApiConfigForOrganization(request, organizationProductId)
  );
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
  const stored = await readStoredOrganizationTrackerToken(organizationProductId);
  if (!stored) {
    throw new TrackerApiConfigError(
      'Нет токена трекера. Сохраните токен во вкладке подключения трекера.',
      422
    );
  }
  return withJiraCloudAuth(null, ctx, stored);
}

async function readStoredOrganizationTrackerToken(
  organizationProductId: string
): Promise<ResolvedTrackerToken | null> {
  const credentials = await getOrganizationTrackerCredentials(organizationProductId);
  if (!credentials) {
    return null;
  }
  const token = credentials.accessToken.replace(/\s+/g, '').trim();
  return token ? { oauthGateway: credentials.atlassianOAuth, token } : null;
}

/** Токен из `X-Tracker-Token` или сохранённый токен организации. */
async function resolveOauthTokenOrThrow(
  organizationProductId: string,
  oauthToken: string,
  missingStatus: 401 | 422
): Promise<ResolvedTrackerToken> {
  if (oauthToken) {
    return { oauthGateway: true, token: oauthToken };
  }
  const stored = await readStoredOrganizationTrackerToken(organizationProductId);
  if (stored) {
    return stored;
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
  return withJiraCloudAuth(request, ctx, token);
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
  return withJiraCloudAuth(request, ctx, resolvedToken);
}

export async function resolveTrackerApiConfigFromRequest(
  request: Request
): Promise<TrackerApiResolvedConfig> {
  const oauthToken = cleanTrackerTokenFromRequest(request);
  const userId = getProductUserIdFromRequest(request);
  const organizationId = parseRegistryUuidString(request.headers.get(TENANT_ORG_HEADER));

  if (userId) {
    return await resolveAuthedOrganizationTrackerApiConfig(
      request,
      userId,
      organizationId ?? (await resolveDefaultOnPremOrganizationId()),
      oauthToken
    );
  }
  // Без сессии — только токен из самого запроса: сохранённый токен организации анониму не выдаём.
  if (!oauthToken) {
    throw new TrackerApiConfigError('Требуется вход', 401);
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
