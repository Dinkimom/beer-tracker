import toast from "react-hot-toast";

import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/LanguageContext";

import { adminTrackerReloadButtonLabel } from "../adminTrackerReloadButtonLabel";

interface AdminTrackerIntegrationFooterProps {
  hasUnsavedChanges: boolean;
  loading: boolean;
  reloadConfirmArmed: boolean;
  saving: boolean;
  onReload: () => void;
  onSave: () => void;
  setReloadConfirmArmed: (value: boolean) => void;
}

export function AdminTrackerIntegrationFooter({
  hasUnsavedChanges,
  loading,
  onReload,
  onSave,
  reloadConfirmArmed,
  saving,
  setReloadConfirmArmed,
}: AdminTrackerIntegrationFooterProps) {
  const { t } = useI18n();

  return (
    <footer
      className="sticky bottom-0 z-20 flex w-full flex-wrap items-center justify-end gap-2 overflow-hidden border-t border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:px-5"
      role="contentinfo"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          className="px-3.5 py-2"
          disabled={loading}
          type="button"
          variant="outline"
          onClick={() => {
            if (hasUnsavedChanges && !reloadConfirmArmed) {
              setReloadConfirmArmed(true);
              toast(t("admin.plannerIntegration.footer.reloadToast"));
              window.setTimeout(() => setReloadConfirmArmed(false), 3000);
              return;
            }
            setReloadConfirmArmed(false);
            onReload();
          }}
        >
          {adminTrackerReloadButtonLabel({
            hasUnsavedChanges,
            loading,
            reloadConfirmArmed,
            t,
          })}
        </Button>
        <Button
          className="px-3.5 py-2"
          disabled={saving || loading || !hasUnsavedChanges}
          type="button"
          variant="primary"
          onClick={onSave}
        >
          {saving
            ? t("admin.plannerIntegration.footer.saveSaving")
            : t("admin.plannerIntegration.footer.save")}
        </Button>
      </div>
    </footer>
  );
}
