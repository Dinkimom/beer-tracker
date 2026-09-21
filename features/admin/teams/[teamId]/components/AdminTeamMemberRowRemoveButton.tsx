import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { useI18n } from "@/contexts/LanguageContext";

export function AdminTeamMemberRowRemoveButton({
  busy,
  displayName,
  onRemove,
}: {
  busy: boolean;
  displayName: string;
  onRemove: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 items-center justify-end">
      <Button
        aria-label={t("admin.teamMemberRow.removeAria", { name: displayName })}
        className="h-11 w-11 shrink-0 p-0 text-gray-600 hover:bg-red-50 hover:text-red-700 dark:text-gray-300 dark:hover:bg-red-900/25 dark:hover:text-red-300"
        disabled={busy}
        title={t("admin.teamMemberRow.removeTitle")}
        type="button"
        variant="ghost"
        onClick={onRemove}
      >
        <Icon className="h-6 w-6" name={busy ? "loader" : "x"} />
      </Button>
    </div>
  );
}
