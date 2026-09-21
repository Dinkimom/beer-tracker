type Translate = (key: string) => string;

export function adminTrackerReloadButtonLabel(args: {
  hasUnsavedChanges: boolean;
  loading: boolean;
  reloadConfirmArmed: boolean;
  t: Translate;
}): string {
  if (args.loading) {
    return args.t('admin.plannerIntegration.footer.reloadLoading');
  }
  if (args.hasUnsavedChanges && args.reloadConfirmArmed) {
    return args.t('admin.plannerIntegration.footer.reloadConfirm');
  }
  return args.t('admin.plannerIntegration.footer.reload');
}
