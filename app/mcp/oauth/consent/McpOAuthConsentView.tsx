'use client';

import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { AuthBackground, AuthCard } from '@/components/AuthScreenChrome';
import { useI18n } from '@/contexts/LanguageContext';
import { MCP_OAUTH_SCOPE } from '@/lib/mcp/oauth/constants';

import { McpOAuthConsentBrandPair } from './McpOAuthConsentBrandPair';

export function McpOAuthConsentView({
  brand,
  clientId,
  clientLabel,
  codeChallenge,
  codeChallengeMethod,
  redirectUri,
  resource,
  scope,
  state,
}: {
  brand: McpOAuthClientBrand;
  clientId: string;
  clientLabel: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  resource: string;
  scope: string;
  state: string;
}) {
  const { t } = useI18n();

  return (
    <AuthBackground>
      <AuthCard>
        <div className="flex flex-col gap-6">
          <McpOAuthConsentBrandPair
            beerLabel={t('mcpOAuth.consent.beerTrackerLabel')}
            brand={brand}
            clientLabel={clientLabel}
          />

          <div className="space-y-2 text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('mcpOAuth.consent.title')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('mcpOAuth.consent.body', { client: clientLabel, scope: MCP_OAUTH_SCOPE })}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {t('mcpOAuth.consent.connectHint')}
            </p>
          </div>

          <form action="/api/oauth/authorize" className="flex flex-col gap-3" method="post">
            <input name="client_id" type="hidden" value={clientId} />
            <input name="redirect_uri" type="hidden" value={redirectUri} />
            <input name="code_challenge" type="hidden" value={codeChallenge} />
            <input name="code_challenge_method" type="hidden" value={codeChallengeMethod} />
            <input name="scope" type="hidden" value={scope} />
            {state ? <input name="state" type="hidden" value={state} /> : null}
            {resource ? <input name="resource" type="hidden" value={resource} /> : null}

            <button
              className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-500 active:scale-[0.98] dark:bg-blue-500 dark:hover:bg-blue-400"
              name="decision"
              type="submit"
              value="approve"
            >
              {t('mcpOAuth.consent.allow')}
            </button>
            <button
              className="cursor-pointer rounded-xl border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 active:scale-[0.98] dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
              name="decision"
              type="submit"
              value="deny"
            >
              {t('mcpOAuth.consent.deny')}
            </button>
          </form>
        </div>
      </AuthCard>
    </AuthBackground>
  );
}
