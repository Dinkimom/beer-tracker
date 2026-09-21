import type { AdminTeamRow } from "@/features/admin/adminTeamCatalog";

import Link from "next/link";

import { useI18n } from "@/contexts/LanguageContext";
import {
  adminListRow,
  adminListRowLayoutGrid,
  badgeMuted,
} from "@/features/admin/adminUiTokens";

import { AdminTeamListRowActions } from "./AdminTeamListRowActions";

interface AdminTeamListRowProps {
  boardNameFromCatalog: string | undefined;
  boardTitleText: string;
  busy: boolean;
  detailHref: string;
  showRemoveTeam?: boolean;
  team: AdminTeamRow;
  onRemove: () => void;
  onToggleActive: (next: boolean) => void;
}

export function AdminTeamListRow({
  boardNameFromCatalog,
  boardTitleText,
  busy,
  detailHref,
  onRemove,
  onToggleActive,
  showRemoveTeam = true,
  team,
}: AdminTeamListRowProps) {
  const { t } = useI18n();
  const activeTooltip = t("admin.teamsPage.activeTeamTooltip");
  const editLabel = t("admin.teamRow.editTeam", { title: team.title });

  return (
    <li className={`${adminListRow} ${adminListRowLayoutGrid}`}>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            className="cursor-pointer font-medium text-gray-900 hover:text-blue-600 hover:underline dark:text-gray-100 dark:hover:text-blue-400"
            href={detailHref}
          >
            {team.title}
          </Link>
          {!team.active ? <span className={badgeMuted}>{t("admin.teamRow.badgeOff")}</span> : null}
        </div>
        <p
          className="truncate text-xs text-gray-500 dark:text-gray-400"
          title={
            boardNameFromCatalog ? undefined : t("admin.teamRow.queueUnknownHint")
          }
        >
          <span className="font-mono">{team.tracker_queue_key}</span>
          <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
          <span>{boardTitleText}</span>
          <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
          <span className="font-mono">{team.tracker_board_id}</span>
        </p>
      </div>
      <AdminTeamListRowActions
        activeTooltip={activeTooltip}
        busy={busy}
        detailHref={detailHref}
        editLabel={editLabel}
        showRemoveTeam={showRemoveTeam}
        team={team}
        onRemove={onRemove}
        onToggleActive={onToggleActive}
      />
    </li>
  );
}
