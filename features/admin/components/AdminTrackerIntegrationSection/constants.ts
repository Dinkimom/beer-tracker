import { listDistinctStatusPaletteKeys } from '@/utils/statusColors';

import { type IntegrationSubtabId } from './types';

export const STATUS_PALETTE_OPTIONS = listDistinctStatusPaletteKeys();

export const sectionBlock =
  'overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/[0.05] dark:bg-white/[0.02]';

export function integrationSubtabs(t: (key: string) => string): Array<{
  id: IntegrationSubtabId;
  label: string;
}> {
  return [
    { id: 'process-setup', label: t('admin.plannerIntegration.subtab.processSetup') },
    {
      id: 'statuses-mapping',
      label: t('admin.plannerIntegration.subtab.statusesMapping'),
    },
  ];
}
