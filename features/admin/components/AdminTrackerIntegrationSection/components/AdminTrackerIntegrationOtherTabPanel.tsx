import type { TrackerStatusRowMeta } from "../types";
import type { CustomSelectOption } from "@/components/CustomSelect";

import { CustomSelect } from "@/components/CustomSelect";
import { useI18n } from "@/contexts/LanguageContext";
import { field, label, muted } from "@/features/admin/adminUiTokens";

import { sectionBlock } from "../constants";

interface AdminTrackerIntegrationOtherTabPanelProps {
  metaLoading: boolean;
  minSp: string;
  minTp: string;
  releaseReadyStatusKey: string;
  releaseReadyStatusOptions: CustomSelectOption<string>[];
  trackerStatusesList: TrackerStatusRowMeta[];
  setMinSp: (value: string) => void;
  setMinTp: (value: string) => void;
  setReleaseReadyStatusKey: (value: string) => void;
}

export function AdminTrackerIntegrationOtherTabPanel({
  metaLoading,
  minSp,
  minTp,
  releaseReadyStatusKey,
  releaseReadyStatusOptions,
  setMinSp,
  setMinTp,
  setReleaseReadyStatusKey,
  trackerStatusesList,
}: AdminTrackerIntegrationOtherTabPanelProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <article className={sectionBlock}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("admin.plannerIntegration.thresholdsTitle")}
        </h3>
        <p className={`mt-0.5 text-xs ${muted}`}>
          {t("admin.plannerIntegration.thresholdsHint")}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ti-min-sp">
              {t("admin.plannerIntegration.minSpLabel")}
            </label>
            <input
              className={field}
              id="ti-min-sp"
              inputMode="decimal"
              placeholder="0"
              type="text"
              value={minSp}
              onChange={(e) => setMinSp(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="ti-min-tp">
              {t("admin.plannerIntegration.minTpLabel")}
            </label>
            <input
              className={field}
              id="ti-min-tp"
              inputMode="decimal"
              placeholder="0"
              type="text"
              value={minTp}
              onChange={(e) => setMinTp(e.target.value)}
            />
          </div>
        </div>
      </article>

      <article className={sectionBlock}>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("admin.plannerIntegration.releasesPlannerTitle")}
        </h3>
        <div className="mt-4">
          <span className={label}>
            {t("admin.plannerIntegration.releaseReadyStatusLabel")}
          </span>
          <CustomSelect
            className="mt-1.5 w-full"
            options={releaseReadyStatusOptions}
            searchPlaceholder={t("admin.plannerIntegration.releaseReadyStatusSearch")}
            searchable
            size="compact"
            title={t("admin.plannerIntegration.releaseReadyStatusTitle")}
            value={releaseReadyStatusKey}
            onChange={(v) => setReleaseReadyStatusKey(v)}
          />
          {trackerStatusesList.length === 0 && !metaLoading ? (
            <p className={`mt-1.5 text-xs ${muted}`}>
              {t("admin.plannerIntegration.loadTrackerCatalogHint")}
            </p>
          ) : null}
        </div>
      </article>
    </div>
  );
}
