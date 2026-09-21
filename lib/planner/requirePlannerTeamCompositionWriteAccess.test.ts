import type * as TrackerRequestConfig from '@/lib/trackerRequestConfig';

import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireTenantContext } from '@/lib/api-tenant';
import {
  TrackerApiConfigError,
  resolveDefaultOnPremOrganizationId,
  verifyTrackerAccessForOrganization,
} from '@/lib/trackerRequestConfig';

import { requirePlannerTeamCompositionWriteAccess } from './requirePlannerTeamCompositionWriteAccess';

vi.mock('@/lib/api-tenant', () => ({
  requireTenantContext: vi.fn(),
}));

vi.mock('@/lib/trackerRequestConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof TrackerRequestConfig>();
  return {
    ...actual,
    resolveDefaultOnPremOrganizationId: vi.fn(),
    verifyTrackerAccessForOrganization: vi.fn(),
  };
});

const ORG = '00000000-0000-4000-8000-000000000001';
const REQ = (headers?: Record<string, string>) =>
  new Request('https://example.test/', { headers });

describe('requirePlannerTeamCompositionWriteAccess', () => {
  beforeEach(() => {
    vi.mocked(requireTenantContext).mockReset();
    vi.mocked(resolveDefaultOnPremOrganizationId).mockReset();
    vi.mocked(verifyTrackerAccessForOrganization).mockReset();
    vi.mocked(verifyTrackerAccessForOrganization).mockResolvedValue(undefined);
  });

  it('allows when tenant context resolves and tracker token is valid', async () => {
    vi.mocked(requireTenantContext).mockResolvedValue({
      ctx: { organizationId: ORG, role: 'member', userId: 'u1' },
      profile: {
        organizationId: ORG,
        orgRole: 'member',
        teamMemberships: [{ isTeamLead: false, isTeamMember: true, teamId: 't1' }],
        userId: 'u1',
      },
    });

    const result = await requirePlannerTeamCompositionWriteAccess(REQ());
    expect(result).toEqual({ organizationId: ORG });
    expect(verifyTrackerAccessForOrganization).toHaveBeenCalledWith(expect.any(Request), ORG);
  });

  it('falls back to org header when tenant context is missing and validates tracker token', async () => {
    vi.mocked(requireTenantContext).mockResolvedValue({
      response: NextResponse.json({ error: 'Требуется вход' }, { status: 401 }),
    });

    const result = await requirePlannerTeamCompositionWriteAccess(
      REQ({ 'x-organization-id': ORG, 'x-tracker-token': 'token' })
    );
    expect(result).toEqual({ organizationId: ORG });
    expect(verifyTrackerAccessForOrganization).toHaveBeenCalledWith(expect.any(Request), ORG);
  });

  it('falls back to default org when tenant context and header are missing', async () => {
    vi.mocked(requireTenantContext).mockResolvedValue({
      response: NextResponse.json({ error: 'Требуется вход' }, { status: 401 }),
    });
    vi.mocked(resolveDefaultOnPremOrganizationId).mockResolvedValue(ORG);

    const result = await requirePlannerTeamCompositionWriteAccess(REQ());
    expect(result).toEqual({ organizationId: ORG });
    expect(resolveDefaultOnPremOrganizationId).toHaveBeenCalled();
  });

  it('returns tracker error when token validation fails', async () => {
    vi.mocked(requireTenantContext).mockResolvedValue({
      ctx: { organizationId: ORG, role: 'member', userId: 'u1' },
      profile: {
        organizationId: ORG,
        orgRole: 'member',
        teamMemberships: [],
        userId: 'u1',
      },
    });
    vi.mocked(verifyTrackerAccessForOrganization).mockRejectedValue(
      new TrackerApiConfigError('Недействительный токен трекера.', 401)
    );

    const result = await requirePlannerTeamCompositionWriteAccess(REQ());
    if (!('response' in result)) {
      expect.fail('expected error response');
    }
    expect(result.response.status).toBe(401);
  });
});
