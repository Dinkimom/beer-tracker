import type { AdminTeamRow } from "@/features/admin/adminTeamCatalog";

import Link from "next/link";

import { Icon } from "@/components/Icon";
import { useI18n } from "@/contexts/LanguageContext";

interface AdminTeamDetailBreadcrumbProps {
  backHref: string;
  editTitle: string;
  initialTeam: AdminTeamRow;
}

export function AdminTeamDetailBreadcrumb({
  backHref,
  editTitle,
  initialTeam,
}: AdminTeamDetailBreadcrumbProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <Link
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
        href={backHref}
      >
        <Icon className="h-4 w-4" name="arrow-left" />
        {t("admin.teamBreadcrumb.teams")}
      </Link>
      <div className="flex items-center gap-2">
        <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
          {editTitle || initialTeam.title}
        </h1>
        {!initialTeam.active ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
            {t("admin.teamBreadcrumb.inactive")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
