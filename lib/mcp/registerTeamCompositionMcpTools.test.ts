import type { AccessProfile } from '@/lib/access/orgAccess';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { describe, expect, it, vi } from 'vitest';

import { applyTeamCompositionOps } from '@/lib/staffTeams/teamCompositionOps';

import { registerTeamCompositionMcpTools } from './registerTeamCompositionMcpTools';

vi.mock('@/lib/staffTeams/teamCompositionOps', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  applyTeamCompositionOps: vi.fn().mockResolvedValue({ applied: [], ok: true }),
  loadTeamComposition: vi.fn().mockResolvedValue({ roles: [], teams: [] }),
}));
vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({
  getIssueTrackerProviderClientForOrganization: vi.fn().mockResolvedValue({ searchUsers: vi.fn().mockResolvedValue([]) }),
}));

type Handler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;

function toolsFor(orgRole: AccessProfile['orgRole']): Map<string, Handler> {
  const handlers = new Map<string, Handler>();
  const server = { registerTool: (name: string, _config: unknown, handler: Handler) => handlers.set(name, handler) };
  registerTeamCompositionMcpTools(server as unknown as McpServer, {
    organizationId: 'org-1',
    profile: { organizationId: 'org-1', orgRole, teamMemberships: [], userId: 'u1' },
  });
  return handlers;
}

const removeOp = {
  confirm: true,
  ops: [{ op: 'removeMember', staffId: '22222222-2222-4222-8222-222222222222', teamId: '11111111-1111-4111-8111-111111111111' }],
};

describe('registerTeamCompositionMcpTools', () => {
  it('участник видит состав, но менять его и искать людей в трекере не может', async () => {
    const tools = toolsFor('member');
    const read = await tools.get('get_team_composition')!({});
    expect(JSON.parse(read.content[0]!.text)).toMatchObject({ canEdit: false });
    for (const name of ['apply_team_composition', 'search_tracker_users']) {
      const result = await tools.get(name)!(name === 'search_tracker_users' ? { query: 'adilet' } : removeOp);
      expect(result).toMatchObject({ isError: true });
      expect(result.content[0]!.text).toMatch(/organization admin/);
    }
    expect(applyTeamCompositionOps).not.toHaveBeenCalled();
  });

  it('администратор организации меняет состав', async () => {
    const tools = toolsFor('org_admin');
    const result = await tools.get('apply_team_composition')!(removeOp);
    expect(result.isError).toBeUndefined();
    expect(applyTeamCompositionOps).toHaveBeenCalledWith({ ops: removeOp.ops, organizationId: 'org-1' });
  });
});
