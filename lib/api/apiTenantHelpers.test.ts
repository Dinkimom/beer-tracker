import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

vi.mock('@/lib/auth/productSession', () => ({
  getProductUserIdFromRequest: vi.fn(() => null),
}));

vi.mock('@/lib/access/orgAccess', () => ({ resolveAccessProfile: vi.fn() }));

vi.mock('@/lib/organizations/organizationRepository', () => ({
  findOrganizationById: vi.fn(),
  listAllOrganizationsAdminSummaries: vi.fn(),
}));

import { resolveAccessProfile } from '@/lib/access/orgAccess';
import { getProductUserIdFromRequest } from '@/lib/auth/productSession';
import {
  findOrganizationById,
  listAllOrganizationsAdminSummaries,
} from '@/lib/organizations/organizationRepository';

import { resolveOnPremTenantContext } from './apiTenantHelpers';

const KNOWN_ORG = '11111111-1111-4111-8111-111111111111';
const STALE_ORG = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';

describe('resolveOnPremTenantContext', () => {
  beforeEach(() => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(USER);
    vi.mocked(findOrganizationById).mockReset();
    vi.mocked(listAllOrganizationsAdminSummaries).mockReset();
    vi.mocked(resolveAccessProfile).mockImplementation((userId, organizationId) =>
      Promise.resolve({ organizationId, orgRole: 'member', teamMemberships: [], userId })
    );
  });

  it('uses header org when it exists in organizations', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue({ id: KNOWN_ORG } as never);
    const request = new Request('http://localhost/api/sprints/1/comments', {
      headers: { [TENANT_ORG_HEADER]: KNOWN_ORG },
    });
    const result = await resolveOnPremTenantContext(request);
    expect('ctx' in result && result.ctx.organizationId).toBe(KNOWN_ORG);
    expect(listAllOrganizationsAdminSummaries).not.toHaveBeenCalled();
  });

  it('ignores stale header org and falls back to the first org in DB', async () => {
    vi.mocked(findOrganizationById).mockResolvedValue(null);
    vi.mocked(listAllOrganizationsAdminSummaries).mockResolvedValue([
      { organization_id: KNOWN_ORG } as never,
    ]);
    const request = new Request('http://localhost/api/sprints/1/comments', {
      headers: { [TENANT_ORG_HEADER]: STALE_ORG },
    });
    const result = await resolveOnPremTenantContext(request);
    expect('ctx' in result && result.ctx.organizationId).toBe(KNOWN_ORG);
    expect(findOrganizationById).toHaveBeenCalledWith(STALE_ORG);
  });

  it('answers 401 without a product session', async () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(null);
    const result = await resolveOnPremTenantContext(
      new Request('http://localhost/api/sprints/1/comments')
    );
    expect('response' in result && result.response.status).toBe(401);
    expect(listAllOrganizationsAdminSummaries).not.toHaveBeenCalled();
  });

  it('answers 403 when the user is not a member of the organization', async () => {
    vi.mocked(listAllOrganizationsAdminSummaries).mockResolvedValue([
      { organization_id: KNOWN_ORG } as never,
    ]);
    vi.mocked(resolveAccessProfile).mockResolvedValue(null);
    const result = await resolveOnPremTenantContext(
      new Request('http://localhost/api/sprints/1/comments')
    );
    expect('response' in result && result.response.status).toBe(403);
  });

  it('takes the role from the membership, not a blanket org_admin', async () => {
    vi.mocked(listAllOrganizationsAdminSummaries).mockResolvedValue([
      { organization_id: KNOWN_ORG } as never,
    ]);
    const result = await resolveOnPremTenantContext(
      new Request('http://localhost/api/sprints/1/comments')
    );
    expect('ctx' in result && result.ctx).toEqual({ organizationId: KNOWN_ORG, role: 'member', userId: USER });
  });
});
