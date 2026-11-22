import type { TrackerWebUrlContext } from './issueTrackerUi';
import type { IssueTrackerProviderClient, IssueTrackerStoredProvider } from './types';

import { UnsupportedIssueTrackerOperationError } from './errors';

/** Иначе `return proxy` из async-функции ждёт `.then` и валит клиент как thenable. */
const PROXY_PASSTHROUGH = new Set(['catch', 'finally', 'then']);

export type PartialProviderClientContext = TrackerWebUrlContext & { organizationId: string };

/**
 * Клиент провайдера, который реализует часть контракта: остальные методы отклоняются
 * `UnsupportedIssueTrackerOperationError` (422), а не падают на `undefined is not a function`.
 */
export function createPartialProviderClient(
  storedProvider: IssueTrackerStoredProvider,
  web: PartialProviderClientContext,
  implemented: Partial<IssueTrackerProviderClient>
): IssueTrackerProviderClient {
  const client = {} as IssueTrackerProviderClient;
  return new Proxy(client, {
    get(_target, prop) {
      if (typeof prop !== 'string' || PROXY_PASSTHROUGH.has(prop)) {
        return undefined;
      }
      if (prop === 'providerKind') {
        return web.kind;
      }
      if (prop === 'webBaseUrl') {
        return web.webBaseUrl;
      }
      if (prop === 'organizationId') {
        return web.organizationId;
      }
      const method = implemented[prop as keyof IssueTrackerProviderClient];
      if (typeof method === 'function') {
        return method;
      }
      return (..._args: unknown[]) =>
        Promise.reject(new UnsupportedIssueTrackerOperationError(prop, storedProvider));
    },
  });
}
