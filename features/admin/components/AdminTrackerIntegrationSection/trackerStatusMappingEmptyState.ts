type TranslateFn = (key: string, params?: Record<string, number | string>) => string;

export function trackerStatusMappingEmptyTitle(params: {
  isEmpty: boolean;
  metaLoading: boolean;
  searchNeedle: string;
  t: TranslateFn;
}): string {
  const { isEmpty, metaLoading, searchNeedle, t } = params;
  if (metaLoading) {
    return t('admin.plannerIntegration.statusMapping.loading');
  }
  if (!isEmpty && searchNeedle) {
    return 'Ничего не найдено';
  }
  return t('admin.plannerIntegration.statusMapping.empty');
}
