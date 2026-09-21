import type { CustomSelectOption } from "@/components/CustomSelect";
import type { AdminTeamRow } from "@/features/admin/adminTeamCatalog";
import type { FormEvent } from "react";

import { Button } from "@/components/Button";
import { useI18n } from "@/contexts/LanguageContext";
import {
  cardBody,
  cardHeader,
  cardShell,
  field,
  hCard,
  label,
} from "@/features/admin/adminUiTokens";

import { AdminTeamSettingsBindingFields } from "./AdminTeamSettingsBindingFields";

interface AdminTeamSettingsSectionProps {
  boardOptions: CustomSelectOption<string>[];
  boardSearchLoading: boolean;
  catalogLoading: boolean;
  editBoard: string;
  editQueue: string;
  editSaving: boolean;
  editTitle: string;
  initialTeam: AdminTeamRow;
  isOrgAdmin: boolean;
  queueOptions: CustomSelectOption<string>[];
  onBoardSearchQueryChange: (query: string) => void;
  onSave: (e: FormEvent) => void;
  setEditBoard: (v: string) => void;
  setEditQueue: (v: string) => void;
  setEditTitle: (v: string) => void;
}

export function AdminTeamSettingsSection({
  boardOptions,
  boardSearchLoading,
  catalogLoading,
  editBoard,
  editQueue,
  editSaving,
  editTitle,
  initialTeam,
  isOrgAdmin,
  queueOptions,
  onBoardSearchQueryChange,
  onSave,
  setEditBoard,
  setEditQueue,
  setEditTitle,
}: AdminTeamSettingsSectionProps) {
  const { t } = useI18n();
  return (
    <section className={cardShell}>
      <div className={cardHeader}>
        <h2 className={hCard}>{t("admin.teamSettings.title")}</h2>
      </div>
      <form
        aria-busy={isOrgAdmin && catalogLoading}
        className={cardBody}
        onSubmit={(e) => void onSave(e)}
      >
        <div className={`grid gap-4 ${isOrgAdmin ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
          <div>
            <label className={label} htmlFor="team-edit-title">
              {t("admin.teamSettings.nameLabel")}
            </label>
            <input
              className={field}
              id="team-edit-title"
              required
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <AdminTeamSettingsBindingFields
            boardOptions={boardOptions}
            boardSearchLoading={boardSearchLoading}
            catalogLoading={catalogLoading}
            editBoard={editBoard}
            editQueue={editQueue}
            initialTeam={initialTeam}
            isOrgAdmin={isOrgAdmin}
            queueOptions={queueOptions}
            setEditBoard={setEditBoard}
            setEditQueue={setEditQueue}
            onBoardSearchQueryChange={onBoardSearchQueryChange}
          />
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
          <Button
            className="px-3.5 py-2"
            disabled={editSaving || (isOrgAdmin && catalogLoading)}
            title={
              isOrgAdmin && catalogLoading ? t("admin.teamSettings.waitCatalog") : undefined
            }
            type="submit"
            variant="primary"
          >
            {editSaving ? t("admin.teamSettings.saveSaving") : t("admin.teamSettings.save")}
          </Button>
        </div>
      </form>
    </section>
  );
}
