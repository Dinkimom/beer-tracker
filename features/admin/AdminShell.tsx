'use client';

import type { UserOrganizationSummary } from '@/lib/organizations';
import type { ReactNode } from 'react';

import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { AdminHeader } from '@/features/admin/AdminHeader';
import { useAdminOrganizationId } from '@/features/admin/AdminOrganizationIdContext';
import { resolveAdminShellRoleLine } from '@/features/admin/AdminShellHelpers';
import { AdminShellMobileDrawer } from '@/features/admin/AdminShellMobileDrawer';
import { AdminShellMobileTopBar } from '@/features/admin/AdminShellMobileTopBar';
import { renderAdminNavListEntry } from '@/features/admin/AdminShellNavHelpers';
import { AdminShellSidebarFooter } from '@/features/admin/AdminShellSidebarFooter';
import { useAdminTrackerConnectionReady } from '@/features/admin/hooks/useAdminTrackerConnectionReady';
import { useAdminShellPersistence } from '@/features/admin/useAdminShellPersistence';
import { resolvePrimaryAdminOrganization } from '@/lib/access/resolvePrimaryAdminOrganization';
import { postProductLogout } from '@/lib/api/auth';
import { issueTrackerProviderMessageKey } from '@/lib/issueTrackerProvider/issueTrackerUi';

interface NavItem {
  href: string;
  icon: string;
  /** i18n key under messages, e.g. `admin.shell.nav.organization` */
  labelKey: string;
  requiresSuperAdmin?: boolean;
  /** Needs saved tracker token and org/site id (tracker settings section). */
  requiresTracker?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/org', icon: 'home', labelKey: 'admin.shell.nav.organization' },
  { href: '/admin/teams', icon: 'users', labelKey: 'admin.shell.nav.teams' },
  { href: '/admin/members', icon: 'user', labelKey: 'admin.shell.nav.members' },
  { href: '/admin/tracker', icon: 'link', labelKey: 'admin.shell.nav.tracker' },
  { href: '/admin/roles', icon: 'hash', labelKey: 'admin.shell.nav.roles' },
  { href: '/admin/planner', icon: 'calendar', labelKey: 'admin.shell.nav.planner' },
  { href: '/admin/sync', icon: 'refresh', labelKey: 'admin.shell.nav.sync', requiresTracker: true },
];

interface AdminShellProps {
  children: ReactNode;
  email: string;
  exporterEnabled: boolean;
  isSuperAdmin: boolean;
  orgs: UserOrganizationSummary[];
}

export function AdminShell({ children, email, exporterEnabled, isSuperAdmin, orgs }: AdminShellProps) {
  const { has, t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const connectOrgId = useAdminOrganizationId();
  const activeOrg = useMemo(
    () =>
      orgs.find((o) => o.organization_id === connectOrgId) ?? resolvePrimaryAdminOrganization(orgs),
    [connectOrgId, orgs]
  );
  const canAdmin = Boolean(activeOrg);
  const isOrgAdminForActive = activeOrg?.role === 'org_admin';

  const { loading: trackerGateLoading, ready: trackerConnectionReady } =
    useAdminTrackerConnectionReady(canAdmin && connectOrgId ? connectOrgId : '');

  useAdminShellPersistence(connectOrgId);

  async function logout() {
    await postProductLogout();
    router.push('/auth-setup');
    router.refresh();
  }

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        labelKey:
          item.href === '/admin/tracker'
            ? issueTrackerProviderMessageKey(item.labelKey, issueTrackerProviderKind)
            : item.labelKey,
      })),
    [issueTrackerProviderKind]
  );
  const activeSection = navItems.find((item) => pathname.startsWith(item.href));
  const roleLine = resolveAdminShellRoleLine(activeOrg, isSuperAdmin, has, t);

  const navList = (
    <nav aria-label={t('admin.shell.navAriaLabel')} className="flex-1 overflow-y-auto p-3">
      <ul className="space-y-1">
        {navItems.map((item) =>
          renderAdminNavListEntry(
            {
              activeOrg,
              connectOrgId,
              exporterEnabled,
              isOrgAdminForActive,
              issueTrackerProviderKind,
              isSuperAdmin,
              item,
              pathname,
              trackerConnectionReady,
              trackerGateLoading,
              t,
            },
            () => setDrawerOpen(false)
          )
        )}
      </ul>
    </nav>
  );

  const sidebarFooter = (
    <AdminShellSidebarFooter
      email={email}
      logoutAria={t('admin.shell.logoutAria')}
      logoutTitle={t('admin.shell.logout')}
      roleLine={roleLine}
      onLogout={() => void logout()}
    />
  );

  const sidebarContent = (
    <>
      {navList}
      {sidebarFooter}
    </>
  );

  return (
    <div className="flex h-full flex-col">
      <AdminHeader
        canAdmin={canAdmin}
        organizationName={activeOrg?.name ?? null}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-ds-border-subtle bg-white dark:bg-gray-800 md:flex">
          {sidebarContent}
        </aside>

        {drawerOpen ? (
          <AdminShellMobileDrawer
            closeMenuAria={t('admin.shell.closeMenuAria')}
            closeMenuTitle={t('admin.shell.closeMenu')}
            mobileMenuTitle={t('admin.shell.mobileMenuTitle')}
            onClose={() => setDrawerOpen(false)}
          >
            {sidebarContent}
          </AdminShellMobileDrawer>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <AdminShellMobileTopBar
            openMenuAria={t('admin.shell.openMenuAria')}
            openMenuTitle={t('admin.shell.openMenu')}
            sectionTitle={activeSection ? t(activeSection.labelKey) : t('admin.shell.defaultSectionTitle')}
            onOpenMenu={() => setDrawerOpen(true)}
          />

          <div className="flex-1 overflow-y-auto overscroll-y-contain">
            <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
