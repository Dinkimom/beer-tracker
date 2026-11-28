import { NextResponse } from 'next/server';

import { isOtorvaEnabled } from '@/lib/issueTrackerProvider/otorvaApi';
import { readOnPremSetupState } from '@/lib/onPrem/setupState';

/**
 * GET /api/onprem/setup-state — состояние первичной инициализации on-prem.
 */
export async function GET() {
  const state = await readOnPremSetupState();
  return NextResponse.json({
    builtInTrackerEnabled: isOtorvaEnabled(),
    onPremMode: true,
    hasOrganizations: state.hasOrganizations,
    hasUsers: state.hasAdmins,
    initialized: state.initialized,
    selfRegistrationAllowed: !state.hasAdmins,
  });
}
