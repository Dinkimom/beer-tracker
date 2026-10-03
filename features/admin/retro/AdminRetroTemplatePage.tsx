'use client';

import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/contexts/LanguageContext';
import { useAdminOrganizationId } from '@/features/admin/AdminOrganizationIdContext';
import { pageStack } from '@/features/admin/adminUiTokens';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { RetroTemplateEditor } from '@/features/admin/retro/RetroTemplateEditor';
import { fetchAdminRetroColumnTemplate } from '@/lib/api/retroColumnTemplate';

export function AdminRetroTemplatePage() {
  const { t } = useI18n();
  const organizationId = useAdminOrganizationId();
  const query = useQuery({
    enabled: Boolean(organizationId),
    queryFn: () => fetchAdminRetroColumnTemplate(organizationId),
    queryKey: ['retro-column-template', organizationId],
  });

  return (
    <div className={pageStack}>
      <AdminPageHeader
        description={t('admin.retroTemplate.description')}
        title={t('admin.retroTemplate.title')}
      />
      {query.isLoading ? <p className="text-sm text-gray-500">{t('admin.retroTemplate.loading')}</p> : null}
      {query.isError ? <p className="text-sm text-red-600">{t('admin.retroTemplate.loadError')}</p> : null}
      {organizationId && query.data ? (
        <RetroTemplateEditor
          key={query.data.updatedAt ?? 'builtin'}
          initialColumns={query.data.columns}
          organizationId={organizationId}
        />
      ) : null}
    </div>
  );
}
