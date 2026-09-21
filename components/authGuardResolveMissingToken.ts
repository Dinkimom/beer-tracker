import { fetchOnPremSetupState } from '@/lib/api/onprem';

export async function resolveMissingTrackerTokenRedirect(): Promise<'auth-setup' | 'register'> {
  try {
    const data = await fetchOnPremSetupState();
    if (data.onPremMode === true && data.hasUsers !== true) {
      return 'register';
    }
    return 'auth-setup';
  } catch {
    return 'auth-setup';
  }
}
