import { useI18n } from "@/contexts/LanguageContext";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export function AdminRolesPageHeader() {
  const { t } = useI18n();
  return (
    <AdminPageHeader
      description={t("admin.rolesPage.pageSubtitle")}
      title={t("admin.rolesPage.pageTitle")}
    />
  );
}
