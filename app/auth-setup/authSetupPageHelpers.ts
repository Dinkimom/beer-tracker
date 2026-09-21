import { fetchOnPremDefaultOrganizationId, fetchOnPremSetupState } from '@/lib/api/onprem';

export interface OnPremGateState {
  firstRun: boolean;
  loadError: boolean;
  loading: boolean;
  organizationId: string | null;
}

const idleGate = {
  firstRun: false,
  loadError: false,
  loading: false,
  organizationId: null,
} as const satisfies OnPremGateState;

export async function loadOnPremGateState(): Promise<OnPremGateState> {
  try {
    const setup = await fetchOnPremSetupState();
    if (setup.hasUsers !== true) {
      return { ...idleGate, firstRun: true };
    }
    const organizationId = await fetchOnPremDefaultOrganizationId();
    return {
      ...idleGate,
      organizationId,
    };
  } catch {
    return { ...idleGate, loadError: true };
  }
}

export function shouldShowAuthSetupSpinner(args: {
  onPremGate: OnPremGateState;
  productTenantSessionLoading: boolean;
}): boolean {
  if (args.onPremGate.loading) return true;
  if (args.onPremGate.loadError) return false;
  if (args.onPremGate.firstRun) return true;
  return (
    args.productTenantSessionLoading &&
    !args.onPremGate.organizationId &&
    !args.onPremGate.firstRun
  );
}

export function resolveAuthSetupOrgId(args: {
  activeOrganizationId: string | null;
  onPremGate: OnPremGateState;
}): string | null {
  return args.activeOrganizationId ?? args.onPremGate.organizationId;
}
