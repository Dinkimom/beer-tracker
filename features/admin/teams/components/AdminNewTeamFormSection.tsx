import type { CustomSelectOption } from "@/components/CustomSelect";
import type { FormEvent } from "react";

import { CustomSelect } from "@/components/CustomSelect";
import { Input } from "@/components/Input";
import { useI18n } from "@/contexts/LanguageContext";
import { label } from "@/features/admin/adminUiTokens";
import { AdminInlineAlert } from "@/features/admin/components/AdminInlineAlert";

interface AdminNewTeamFormSectionProps {
  boardSearchLoading: boolean;
  boardSelectOptions: CustomSelectOption<string>[];
  catalogLoading: boolean;
  /** id формы: кнопка отправки стоит в подвале окна и ссылается на неё атрибутом `form`. */
  formId: string;
  newTeamTitle: string;
  queueSelectOptions: CustomSelectOption<string>[];
  selectTeamBoard: string;
  selectTeamQueue: string;
  onBoardSearchQueryChange: (query: string) => void;
  setNewTeamTitle: (v: string) => void;
  setSelectTeamBoard: (v: string) => void;
  setSelectTeamQueue: (v: string) => void;
  submitNewTeam: (e: FormEvent) => Promise<boolean>;
}

export function AdminNewTeamFormSection({
  boardSearchLoading,
  boardSelectOptions,
  catalogLoading,
  formId,
  newTeamTitle,
  queueSelectOptions,
  selectTeamBoard,
  selectTeamQueue,
  onBoardSearchQueryChange,
  setNewTeamTitle,
  setSelectTeamBoard,
  setSelectTeamQueue,
  submitNewTeam,
}: AdminNewTeamFormSectionProps) {
  const { t } = useI18n();
  return (
    <form className="space-y-4" id={formId} onSubmit={(e) => void submitNewTeam(e)}>
      <div>
        <label className={label} htmlFor="team-title">
          {t("admin.newTeamForm.nameLabel")}
        </label>
        <Input
          autoFocus
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
    </form>
  );
}
