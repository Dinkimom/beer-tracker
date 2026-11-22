/**
 * Встроенный трекер otorva (`services/otorva`): REST `…/api/v1`, JWT пользователя по email и паролю.
 * Веб-интерфейса у трекера нет — `webBaseUrl` пустой, ссылок «открыть в трекере» нет.
 * Нереализованные методы контракта отклоняются `UnsupportedIssueTrackerOperationError`.
 */
import type {
  IssueTrackerProviderClient,
  OtorvaIssueTrackerProvider,
  OtorvaProviderClientConfig,
} from './types';

import { resolveTrackerApiConfigFromRequest } from '@/lib/trackerRequestConfig';

import { createPartialProviderClient } from './partialProviderClient';

const OTORVA_PROVIDER_KIND = 'otorva' as const;

/**
 * В сети compose; для `pnpm dev` на хосте — `127.0.0.1:8090` в настройках организации.
 * HTTP: обмен между контейнерами внутри сети compose, наружу сервис не публикуется.
 */
// eslint-disable-next-line sonarjs/no-clear-text-protocols -- внутренняя сеть compose, без TLS
export const OTORVA_DEFAULT_API_URL = 'http://otorva:8080/api/v1';

export const OTORVA_IMPLEMENTED_PROVIDER_METHODS = [] as const satisfies ReadonlyArray<
  keyof IssueTrackerProviderClient
>;

export function createOtorvaProviderClient(config: OtorvaProviderClientConfig): IssueTrackerProviderClient {
  return createPartialProviderClient(
    OTORVA_PROVIDER_KIND,
    { kind: OTORVA_PROVIDER_KIND, organizationId: config.organizationId, webBaseUrl: '' },
    {}
  );
}

async function createOtorvaProviderClientFromRequest(request: Request): Promise<IssueTrackerProviderClient> {
  const config = await resolveTrackerApiConfigFromRequest(request);
  if (config.providerKind !== OTORVA_PROVIDER_KIND) {
    throw new Error(`Organization tracker is ${config.providerKind}, not the built-in tracker`);
  }
  return createOtorvaProviderClient({
    apiUrl: config.apiUrl,
    organizationId: config.organizationId,
    token: config.oauthToken,
  });
}

export const otorvaTrackerProvider: OtorvaIssueTrackerProvider = {
  createProviderClient: createOtorvaProviderClient,
  createProviderClientFromRequest: createOtorvaProviderClientFromRequest,
  kind: OTORVA_PROVIDER_KIND,
};
