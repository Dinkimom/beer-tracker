import { NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { requireTenantContext } from '@/lib/api-tenant';

import { parseSprintIdParam, requireSprintRouteContext } from './sprintRouteContext';

vi.mock('@/lib/api-tenant', () => ({ requireTenantContext: vi.fn() }));

const ctx = { organizationId: 'org-1', role: 'member', userId: 'user-1' } as const;
const request = new Request('http://localhost/api/sprints/12/links');

describe('parseSprintIdParam', () => {
  it('accepts positive integers only', () => {
    expect(parseSprintIdParam('12')).toBe(12);
    expect(parseSprintIdParam('0')).toBeNull();
    expect(parseSprintIdParam('-3')).toBeNull();
    expect(parseSprintIdParam('12abc')).toBeNull();
    expect(parseSprintIdParam('1.5')).toBeNull();
    expect(parseSprintIdParam('')).toBeNull();
    expect(parseSprintIdParam(undefined)).toBeNull();
    expect(parseSprintIdParam('99999999999999999999')).toBeNull();
  });
});

describe('requireSprintRouteContext', () => {
  it('returns tenant, sprint id and the other path params', async () => {
    vi.mocked(requireTenantContext).mockResolvedValue({ ctx, profile: {} as never });
    const result = await requireSprintRouteContext(request, Promise.resolve({ linkId: 'l-1', sprintId: '12' }));
    expect(result).toEqual({ ctx, params: { linkId: 'l-1', sprintId: '12' }, sprintId: 12 });
  });

  it('answers 400 for a bad sprint id', async () => {
    vi.mocked(requireTenantContext).mockResolvedValue({ ctx, profile: {} as never });
    const result = await requireSprintRouteContext(request, { sprintId: '12abc' });
    expect('response' in result && result.response.status).toBe(400);
  });

  it('passes the tenant error through before looking at the path', async () => {
    const denied = NextResponse.json({ error: 'nope' }, { status: 401 });
    vi.mocked(requireTenantContext).mockResolvedValue({ response: denied });
    const result = await requireSprintRouteContext(request, { sprintId: 'bad' });
    expect('response' in result && result.response).toBe(denied);
  });

  it('uses a tenant resolved by the caller (MCP auth)', async () => {
    vi.mocked(requireTenantContext).mockClear();
    const result = await requireSprintRouteContext(request, { sprintId: '7' }, { ctx });
    expect(result).toMatchObject({ ctx, sprintId: 7 });
    expect(requireTenantContext).not.toHaveBeenCalled();
  });
});
