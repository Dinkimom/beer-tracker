import type { CustomSelectOption } from "@/components/CustomSelect";
import type { FormEvent } from "react";

import { Button } from "@/components/Button";
import { CustomSelect } from "@/components/CustomSelect";
import { useI18n } from "@/contexts/LanguageContext";
import { field, label } from "@/features/admin/adminUiTokens";
import { AdminInlineAlert } from "@/features/admin/components/AdminInlineAlert";

interface AdminNewTeamFormSectionProps {
  boardSearchLoading: boolean;
  boardSelectOptions: CustomSelectOption<string>[];
  catalogLoading: boolean;
  newTeamTitle: string;
  orgId: string;
  queueSelectOptions: CustomSelectOption<string>[];
  selectTeamBoard: string;
  selectTeamQueue: string;
  teamFormSubmitting: boolean;
  onBoardSearchQueryChange: (query: string) => void;
  onCancel: () => void;
  setNewTeamTitle: (v: string) => void;
  setSelectTeamBoard: (v: string) => void;
  setSelectTeamQueue: (v: string) => void;
  submitNewTeam: (e: FormEvent) => Promise<boolean>;
}

export function AdminNewTeamFormSection({
  boardSearchLoading,
  boardSelectOptions,
  catalogLoading,
  newTeamTitle,
  orgId,
  queueSelectOptions,
  selectTeamBoard,
  selectTeamQueue,
  teamFormSubmitting,
  onBoardSearchQueryChange,
  onCancel,
  setNewTeamTitle,
  setSelectTeamBoard,
  setSelectTeamQueue,
  submitNewTeam,
}: AdminNewTeamFormSectionProps) {
  const { t } = useI18n();
  return (
    <form className="space-y-4" onSubmit={(e) => void submitNewTeam(e)}>
      <div>
        <label className={label} htmlFor="team-title">
          {t("admin.newTeamForm.nameLabel")}
        </label>
        <input
          autoFocus
          className={field}
          id="team-title"
          placeholder={t("admin.newTeamForm.namePlaceholder")}
          required
          type="text"
          value={newTeamTitle}
          onChange={(e) => setNewTeamTitle(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="min-w-0">
          <span className={label}>{t("admin.newTeamForm.queueLabel")}</span>
          <CustomSelect
            className="w-full"
            options={queueSelectOptions}
            searchPlaceholder={t("admin.newTeamForm.queueSearch")}
            searchable
            selectedPrefix=""
            title={t("admin.newTeamForm.queueTitle")}
            value={selectTeamQueue}
            onChange={setSelectTeamQueue}
          />
          {!catalogLoading && queueSelectOptions.length <= 1 ? (
            <div className="mt-1.5">
              <AdminInlineAlert variant="warning">{t("admin.newTeamForm.queuesEmpty")}</AdminInlineAlert>
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <span className={label}>{t("admin.newTeamForm.boardLabel")}</span>
          <CustomSelect
            className="w-full"
            isSearchLoading={boardSearchLoading}
            options={boardSelectOptions}
            searchLoadingMessage={t("admin.teamsPage.catalogLoading")}
            searchPlaceholder={t("admin.newTeamForm.boardSearch")}
            searchable
            selectedPrefix=""
            title={t("admin.newTeamForm.boardTitle")}
            value={selectTeamBoard}
            onChange={setSelectTeamBoard}
            onSearchQueryChange={onBoardSearchQueryChange}
          />
          {!catalogLoading && boardSelectOptions.length <= 1 ? (
            <div className="mt-1.5">
              <AdminInlineAlert variant="warning">{t("admin.newTeamForm.boardsEmpty")}</AdminInlineAlert>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={teamFormSubmitting} type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          disabled={teamFormSubmitting || !orgId || catalogLoading}
          type="submit"
          variant="primary"
        >
          {teamFormSubmitting ? t("admin.newTeamForm.submitSaving") : t("admin.newTeamForm.submit")}
        </Button>
      </div>
    </form>
  );
}
