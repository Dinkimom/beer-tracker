import { describe, expect, it } from 'vitest';

import { isPublicApiPath } from './apiAccessGate';

describe('isPublicApiPath', () => {
  it('lets login, MCP OAuth, cron and on-prem setup through without a session', () => {
    expect(isPublicApiPath('/api/auth/login', false)).toBe(true);
    expect(isPublicApiPath('/api/auth/onprem/tracker-session', false)).toBe(true);
    expect(isPublicApiPath('/api/oauth/token', false)).toBe(true);
    expect(isPublicApiPath('/api/internal/sync/tick', false)).toBe(true);
    expect(isPublicApiPath('/api/onprem/setup-state', false)).toBe(true);
  });

  it('requires a session for planner, tracker proxy and feature routes', () => {
    expect(isPublicApiPath('/api/sprints/12/positions', false)).toBe(false);
    expect(isPublicApiPath('/api/issues/BT-1/status', false)).toBe(false);
    expect(isPublicApiPath('/api/features', false)).toBe(false);
    expect(isPublicApiPath('/api/files/upload', false)).toBe(false);
    expect(isPublicApiPath('/api/authx', false)).toBe(false);
  });

  it('accepts a bearer token only on routes that verify MCP tokens', () => {
    expect(isPublicApiPath('/api/mcp', false)).toBe(true);
    expect(isPublicApiPath('/api/sprints/12/sprint-context', true)).toBe(true);
    expect(isPublicApiPath('/api/sprints/12/sprint-context', false)).toBe(false);
    expect(isPublicApiPath('/api/sprints/12/positions', true)).toBe(false);
    expect(isPublicApiPath('/api/mcp/extra', true)).toBe(false);
  });
});
