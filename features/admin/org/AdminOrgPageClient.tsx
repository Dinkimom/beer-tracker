'use client';

import type { UserOrganizationSummary } from '@/lib/organizations';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useAdminOrganizationId } from '@/features/admin/AdminOrganizationIdContext';
import { AdminOrgSection } from '@/features/admin/components/AdminOrgSection';
import {
  applyRenamedOrganization,
  patchOrganizationName,
} from '@/features/admin/org/adminOrgPageClientHelpers';
import { resolvePrimaryAdminOrganization } from '@/lib/access/resolvePrimaryAdminOrganization';
import { createOrganization } from '@/lib/api/organizations';
import { readApiErrorMessage } from '@/lib/api/readApiError';

interface AdminOrgPageClientProps {
  initialOrgs: UserOrganizationSummary[];
}

export function AdminOrgPageClient({ initialOrgs }: AdminOrgPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const organizationId = useAdminOrganizationId();
  const [orgs, setOrgs] = useState(initialOrgs);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const organization = useMemo(() => {
    const fromId = orgs.find((o) => o.organization_id === organizationId);
    if (fromId) {
      return fromId;
    }
    return resolvePrimaryAdminOrganization(orgs);
  }, [orgs, organizationId]);

  const canRename = organization?.role === 'org_admin';

  useEffect(() => {
    setRenameDraft(organization?.name ?? '');
  }, [organization?.name, organization?.organization_id]);

  useEffect(() => {
    setOrgs(initialOrgs);
  }, [initialOrgs]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const organization = await createOrganization(orgName);
      const newOrg: UserOrganizationSummary = {
        canAccessAdmin: true,
        canUsePlanner: true,
        managedTeamIds: null,
        initial_sync_completed_at: null,
        name: organization.name,
        organization_id: organization.id,
        role: 'org_admin',
        slug: organization.slug,
      };
      setOrgs([newOrg]);
      setOrgName('');
      router.replace('/admin/org');
      toast.success(t('admin.orgPage.createSuccess'));
      router.refresh();
    } catch (error) {
      toast.error(readApiErrorMessage(error, t('admin.orgPage.createFailed')));
    } finally {
      setLoading(false);
    }
  }

  async function renameOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!organization || organization.role !== 'org_admin') {
      return;
    }
    const id = organization.organization_id;
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      toast.error(t('admin.orgPage.nameRequired'));
      return;
    }
    if (trimmed === organization.name) {
      return;
    }
    setRenameLoading(true);
    try {
      const result = await patchOrganizationName(id, trimmed);
      if (!result.ok) {
        toast.error(result.error ?? t('admin.orgPage.renameFailed'));
        return;
      }
      setOrgs((prev) => applyRenamedOrganization(prev, id, result.organization));
      toast.success(t('admin.orgPage.renameSuccess'));
      router.refresh();
    } catch {
      toast.error(t('admin.common.networkError'));
    } finally {
      setRenameLoading(false);
    }
  }

  return (
    <AdminOrgSection
      canRename={canRename}
      createLoading={loading}
      orgName={orgName}
      organization={organization}
      renameDraft={renameDraft}
      renameLoading={renameLoading}
      onOrgNameChange={setOrgName}
      onRenameDraftChange={setRenameDraft}
      onRenameSubmit={(e) => void renameOrg(e)}
      onSubmit={(e) => void createOrg(e)}
    />
  );
}
