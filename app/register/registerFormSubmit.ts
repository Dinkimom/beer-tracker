import { postProductRegister } from '@/lib/api/auth';
import { readApiErrorMessage } from '@/lib/api/readApiError';

export async function submitRegisterForm(input: {
  cloudId?: string;
  expiresAt?: number;
  jiraEmail?: string;
  onboardingMode: boolean;
  organizationName: string;
  refreshToken?: string;
  t: (key: string) => string;
  token: string;
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
      refreshToken: input.refreshToken?.trim() || undefined,
      token: input.token,
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
