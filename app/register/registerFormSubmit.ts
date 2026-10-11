import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { postProductRegister } from '@/lib/api/auth';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import { jiraCloudSiteRestApiUrl } from '@/lib/atlassianOAuth/jiraCloudApiUrl';

/**
 * URL API для регистрации: Jira Cloud — из сайта OAuth Atlassian, Яндекс — публичный API
 * (пусто), Jira DC — из поля формы.
 */
export function registerTrackerApiUrl(
  provider: IssueTrackerProviderKind,
  input: { atlassianSiteUrl: string; typedApiUrl: string }
): string {
  if (provider === 'jira-cloud') {
    return jiraCloudSiteRestApiUrl(input.atlassianSiteUrl);
  }
  return provider === 'tracker' ? '' : input.typedApiUrl;
}

export async function submitRegisterForm(input: {
  cloudId?: string;
  expiresAt?: number;
  jiraEmail?: string;
  onboardingMode: boolean;
  organizationName: string;
  provider: IssueTrackerProviderKind;
  refreshToken?: string;
  t: (key: string) => string;
  token: string;
  trackerApiBaseUrl: string;
  trackerOrgId: string;
}): Promise<{ error: string; ok: false } | { ok: true; organizationId: string }> {
  if (!input.onboardingMode) {
    return { ok: false, error: input.t('productAuth.register.genericError') };
  }
  try {
    const data = await postProductRegister({
      cloudId: input.cloudId?.trim() || undefined,
      expiresAt: input.expiresAt,
      orgName: input.organizationName,
      provider: input.provider,
      refreshToken: input.refreshToken?.trim() || undefined,
      token: input.token,
      trackerApiBaseUrl: input.trackerApiBaseUrl.trim(),
      trackerOrgId: input.trackerOrgId.trim() || undefined,
    });
    const organizationId = data.organization?.id?.trim() ?? '';
    if (!organizationId) {
      return { ok: false, error: input.t('productAuth.register.genericError') };
    }
    return { ok: true, organizationId };
  } catch (error) {
    return {
      ok: false,
      error: readApiErrorMessage(error, input.t('productAuth.register.genericError')),
    };
  }
}
