import type { RolesTabId } from "../rolesPageConstants";

import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/LanguageContext";
import { tabBtnActive, tabBtnBase, tabBtnIdle, tabList } from "@/features/admin/adminUiTokens";

interface AdminRolesTabListProps {
  activeRolesTab: RolesTabId;
  orgRolesCount: number;
  systemRolesCount: number;
  onTabChange: (tab: RolesTabId) => void;
}

export function AdminRolesTabList({
  activeRolesTab,
  onTabChange,
  orgRolesCount,
  systemRolesCount,
}: AdminRolesTabListProps) {
  const { t } = useI18n();
  return (
    <div
      aria-label={t("admin.rolesPage.tabsAria")}
      className={tabList}
      role="tablist"
    >
      <Button
        aria-controls="roles-panel-system"
        aria-selected={activeRolesTab === "system"}
        className={`${tabBtnBase} !flex !min-h-0 !justify-center items-center gap-1.5 ${
          activeRolesTab === "system" ? tabBtnActive : tabBtnIdle
        }`}
        id="roles-tab-system"
        role="tab"
        type="button"
        variant="ghost"
        onClick={() => onTabChange("system")}
      >
        {t("admin.rolesPage.tabSystem")}
        <span
          className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
            activeRolesTab === "system"
              ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
              : "bg-gray-200/60 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {systemRolesCount}
        </span>
      </Button>
      <Button
        aria-controls="roles-panel-organization"
        aria-selected={activeRolesTab === "organization"}
        className={`${tabBtnBase} !flex !min-h-0 !justify-center items-center gap-1.5 ${
          activeRolesTab === "organization" ? tabBtnActive : tabBtnIdle
        }`}
        id="roles-tab-organization"
        role="tab"
        type="button"
        variant="ghost"
        onClick={() => onTabChange("organization")}
      >
        {t("admin.rolesPage.tabOrganization")}
        <span
          className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
            activeRolesTab === "organization"
              ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
              : "bg-gray-200/60 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {orgRolesCount}
        </span>
      </Button>
    </div>
  );
}
