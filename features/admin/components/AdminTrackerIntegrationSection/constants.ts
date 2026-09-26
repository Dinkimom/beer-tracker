import { listDistinctStatusPaletteKeys } from '@/utils/statusColors';

import { type IntegrationSubtabId } from './types';

export const STATUS_PALETTE_OPTIONS = listDistinctStatusPaletteKeys();

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
