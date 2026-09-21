import { afterEach, describe, expect, it, vi } from 'vitest';

import { logAdminAccessDenied } from './adminAccessAudit';

describe('logAdminAccessDenied', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a single warn line with tag and ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logAdminAccessDenied('team_management', {
      organizationId: 'org-uuid',
      teamId: 'team-uuid',
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toContain('[admin_access_denied]');
    expect(line).toContain('tag=team_management');
    expect(line).toContain('org=org-uuid');
    expect(line).toContain('team=team-uuid');
  });
});
