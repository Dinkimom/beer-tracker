import { describe, expect, it, vi } from 'vitest';

import {
  isAdminNavItemVisible,
  showAdminTrackerIncomplete,
  type AdminShellNavContext,
} from './AdminShellNavHelpers';

function ctx(
  patch: Partial<AdminShellNavContext> & Pick<AdminShellNavContext, 'item'>
): AdminShellNavContext {
  return {
    activeOrg: {
      canAccessAdmin: false,
      canUsePlanner: true,
      initial_sync_completed_at: null,
      managedTeamIds: [],
      name: 'Org',
      organization_id: 'org-1',
      role: 'member',
      slug: null,
    },
    connectOrgId: 'org-1',
    exporterEnabled: true,
    isOrgAdminForActive: false,
    issueTrackerProviderKind: 'tracker',
    isSuperAdmin: false,
    pathname: '/admin/tracker',
    trackerConnectionReady: true,
    trackerGateLoading: false,
    t: vi.fn((key: string) => key),
    ...patch,
  };
}

describe('isAdminNavItemVisible', () => {
  it('shows tracker settings to an org member', () => {
    expect(
      isAdminNavItemVisible(
        ctx({ item: { href: '/admin/tracker', icon: 'link', labelKey: 'admin.shell.nav.tracker' } })
      )
    ).toBe(true);
  });

  it('hides members admin for a non-admin member', () => {
    expect(
      isAdminNavItemVisible(
        ctx({ item: { href: '/admin/members', icon: 'user', labelKey: 'admin.shell.nav.members' } })
      )
    ).toBe(false);
  });
});

describe('showAdminTrackerIncomplete', () => {
  it('marks tracker incomplete for a member when the org is not connected', () => {
    expect(
      showAdminTrackerIncomplete(
        ctx({
          item: { href: '/admin/tracker', icon: 'link', labelKey: 'admin.shell.nav.tracker' },
          trackerConnectionReady: false,
        })
      )
    ).toBe(true);
  });
});
