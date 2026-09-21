import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchOnPremDefaultOrganizationId,
  fetchOnPremSetupState,
} from '@/lib/api/onprem';

import {
  loadOnPremGateState,
  resolveAuthSetupOrgId,
  shouldShowAuthSetupSpinner,
  type OnPremGateState,
} from './authSetupPageHelpers';

vi.mock('@/lib/api/onprem', () => ({
  fetchOnPremDefaultOrganizationId: vi.fn(),
  fetchOnPremSetupState: vi.fn(),
}));

const mockedFetchSetup = vi.mocked(fetchOnPremSetupState);
const mockedFetchDefaultOrg = vi.mocked(fetchOnPremDefaultOrganizationId);

function gate(partial?: Partial<OnPremGateState>): OnPremGateState {
  return {
    firstRun: false,
    loadError: false,
    loading: false,
    organizationId: null,
    ...partial,
  };
}

describe('loadOnPremGateState', () => {
  beforeEach(() => {
    mockedFetchSetup.mockReset();
    mockedFetchDefaultOrg.mockReset();
  });

  it('marks first run when there are no users yet', async () => {
    mockedFetchSetup.mockResolvedValue({ onPremMode: true, hasUsers: false });
    await expect(loadOnPremGateState()).resolves.toEqual(gate({ firstRun: true }));
    expect(mockedFetchDefaultOrg).not.toHaveBeenCalled();
  });

  it('loads the default organization after setup', async () => {
    mockedFetchSetup.mockResolvedValue({ onPremMode: true, hasUsers: true });
    mockedFetchDefaultOrg.mockResolvedValue('org-1');
    await expect(loadOnPremGateState()).resolves.toEqual(gate({ organizationId: 'org-1' }));
  });

  it('does not pretend the user must sign in when setup-state fails', async () => {
    mockedFetchSetup.mockRejectedValue(new Error('db down'));
    await expect(loadOnPremGateState()).resolves.toEqual(gate({ loadError: true }));
  });
});

describe('shouldShowAuthSetupSpinner', () => {
  it('keeps the spinner while the on-prem gate is loading', () => {
    expect(
      shouldShowAuthSetupSpinner({
        onPremGate: gate({ loading: true }),
        productTenantSessionLoading: false,
      })
    ).toBe(true);
  });

  it('shows the token form instead of a spinner after a setup-state failure', () => {
    expect(
      shouldShowAuthSetupSpinner({
        onPremGate: gate({ loadError: true }),
        productTenantSessionLoading: true,
      })
    ).toBe(false);
  });
});

describe('resolveAuthSetupOrgId', () => {
  it('prefers the active product organization over the on-prem default', () => {
    expect(
      resolveAuthSetupOrgId({
        activeOrganizationId: 'active',
        onPremGate: gate({ organizationId: 'default' }),
      })
    ).toBe('active');
  });
});
