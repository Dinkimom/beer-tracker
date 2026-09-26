'use client';

import type { TrackerIntegrationFieldRow } from '../hooks/useTrackerIntegrationFormState';
import type { TrackerPlatformMappingRow } from '../trackerPlatformMappingHelpers';
import type {
  EmbeddedTestingOnlyJoin,
  EmbeddedTestingOnlyRuleForm,
  PlatformMappingFilter,
  PlatformValueMapFormRow,
} from '../types';
import type { CustomSelectOption } from '@/components/CustomSelect';
import type { Dispatch, SetStateAction } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import {
  embeddedProcessSetupFieldRows,
  processSetupFieldMappingSelectOptions,
  standaloneProcessSetupFieldRows,
} from '../trackerIntegrationFieldMappingHelpers';

import { TrackerEmbeddedTestingRulesPanel } from './TrackerEmbeddedTestingRulesPanel';
import { TrackerPlatformMappingPanel } from './TrackerPlatformMappingPanel';

function updatePlatformValueMapRow(
  prev: PlatformValueMapFormRow[],
  trackerValue: string,
  next: string
): PlatformValueMapFormRow[] {
  const rest = prev.filter((x) => x.trackerValue !== trackerValue);
  if (!next) {
    return rest;
  }
  return [
    ...rest,
    {
      platform: next as PlatformValueMapFormRow['platform'],
      trackerValue,
    },
  ];
}

interface AdminTrackerIntegrationProcessSetupPanelProps {
  allFieldSelectOptions: CustomSelectOption<string>[];
  devAssigneeFieldId: string;
  devEstimateFieldId: string;
  embeddedTestingOnlyJoins: EmbeddedTestingOnlyJoin[];
  embeddedTestingOnlyRules: EmbeddedTestingOnlyRuleForm[];
  fieldClass: string;
  fieldRows: TrackerIntegrationFieldRow[];
  fieldSelectOptions: CustomSelectOption<string>[];
  label: string;
  muted: string;
  numericFieldSelectOptions: CustomSelectOption<string>[];
  platformFieldId: string;
  platformFieldValues: string[];
  platformFieldValuesLoading: boolean;
  platformMappingFilter: PlatformMappingFilter;
  platformMappingStats: { changed: number; unmapped: number };
  platformValueMap: PlatformValueMapFormRow[];
  qaEngineerFieldId: string;
  qaEstimateFieldId: string;
  releaseMrFieldId: string;
  setDevAssigneeFieldId: Dispatch<SetStateAction<string>>;
  setDevEstimateFieldId: Dispatch<SetStateAction<string>>;
  setEmbeddedTestingOnlyJoins: Dispatch<SetStateAction<EmbeddedTestingOnlyJoin[]>>;
  setEmbeddedTestingOnlyRules: Dispatch<SetStateAction<EmbeddedTestingOnlyRuleForm[]>>;
  setPlatformFieldId: Dispatch<SetStateAction<string>>;
  setPlatformMappingFilter: Dispatch<SetStateAction<PlatformMappingFilter>>;
  setPlatformValueMap: Dispatch<SetStateAction<PlatformValueMapFormRow[]>>;
  setQaEngineerFieldId: Dispatch<SetStateAction<string>>;
  setQaEstimateFieldId: Dispatch<SetStateAction<string>>;
  setReleaseMrFieldId: Dispatch<SetStateAction<string>>;
  setTestingFlowMode: Dispatch<SetStateAction<'embedded' | 'standalone'>>;
  tabBtnBase: string;
  tabBtnIdle: string;
  testingFlowMode: 'embedded' | 'standalone';
  visiblePlatformMappingRows: TrackerPlatformMappingRow[];
}

export function AdminTrackerIntegrationProcessSetupPanel({
  allFieldSelectOptions,
  devAssigneeFieldId,
  devEstimateFieldId,
  embeddedTestingOnlyJoins,
  embeddedTestingOnlyRules,
  fieldClass,
  fieldRows,
  fieldSelectOptions,
  label,
  muted,
  numericFieldSelectOptions,
  platformFieldId,
  platformFieldValues,
  platformFieldValuesLoading,
  platformMappingFilter,
  platformMappingStats,
  platformValueMap,
  qaEngineerFieldId,
  qaEstimateFieldId,
  releaseMrFieldId,
  setDevAssigneeFieldId,
  setDevEstimateFieldId,
  setEmbeddedTestingOnlyJoins,
  setEmbeddedTestingOnlyRules,
  setPlatformFieldId,
  setPlatformMappingFilter,
  setPlatformValueMap,
  setQaEngineerFieldId,
  setQaEstimateFieldId,
  setReleaseMrFieldId,
  setTestingFlowMode,
  tabBtnBase,
  tabBtnIdle,
  testingFlowMode,
  visiblePlatformMappingRows,
}: AdminTrackerIntegrationProcessSetupPanelProps) {
  const { t } = useI18n();
  const fieldMappingRows =
    testingFlowMode === 'embedded'
      ? embeddedProcessSetupFieldRows(
          t,
          {
            setDevAssigneeFieldId,
            setDevEstimateFieldId,
            setQaEngineerFieldId,
            setQaEstimateFieldId,
            setReleaseMrFieldId,
          },
          {
            devAssigneeFieldId,
            devEstimateFieldId,
            qaEngineerFieldId,
            qaEstimateFieldId,
            releaseMrFieldId,
          }
        )
      : standaloneProcessSetupFieldRows(
          t,
          { setDevAssigneeFieldId, setDevEstimateFieldId, setReleaseMrFieldId },
          { devAssigneeFieldId, devEstimateFieldId, releaseMrFieldId }
        );
  const fieldMappingOptionLists = {
    any: fieldSelectOptions,
    numeric: numericFieldSelectOptions,
  };

  return (
    <>
      <TrackerPlatformMappingPanel
        fieldSelectOptions={fieldSelectOptions}
        labelClass={label}
        mutedClass={muted}
        platformFieldId={platformFieldId}
        platformFieldValues={platformFieldValues}
        platformFieldValuesLoading={platformFieldValuesLoading}
        platformMappingFilter={platformMappingFilter}
        platformValueMap={platformValueMap}
        stats={platformMappingStats}
        tabBtnBase={tabBtnBase}
        tabBtnIdle={tabBtnIdle}
        visibleRows={visiblePlatformMappingRows}
        onPlatformFieldChange={(v) => {
          setPlatformFieldId(v);
          setPlatformValueMap([]);
        }}
        onPlatformMappingFilterChange={setPlatformMappingFilter}
        onRowPlatformChange={(trackerValue, next) => {
          setPlatformValueMap((prev) => updatePlatformValueMapRow(prev, trackerValue, next));
        }}
      />

      <div className="mt-5 border-t border-gray-200/80 pt-4 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('admin.plannerIntegration.testingSetupTitle')}
        </h3>
        <p className={`mt-0.5 text-xs ${muted}`}>
          {t('admin.plannerIntegration.testingSetupSubtitle')}
        </p>
        <div
          aria-label={t('admin.plannerIntegration.testingFlowAria')}
          className="mt-3 inline-flex w-full max-w-md flex-col gap-2 sm:flex-row sm:rounded-lg sm:bg-gray-100 sm:p-1 sm:dark:bg-gray-900/60"
          role="radiogroup"
        >
          {(['embedded', 'standalone'] as const).map((mode) => (
            <button
              key={mode}
              aria-checked={testingFlowMode === mode}
              className={`${tabBtnBase} w-full px-3 py-2.5 text-left text-sm sm:text-center ${
                testingFlowMode === mode
                  ? 'border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
                  : `${tabBtnIdle} rounded-lg border border-transparent sm:border-0`
              }`}
              role="radio"
              type="button"
              onClick={() => setTestingFlowMode(mode)}
            >
              <span className="font-medium">
                {mode === 'embedded'
                  ? t('admin.plannerIntegration.embeddedMode')
                  : t('admin.plannerIntegration.standaloneMode')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-gray-200/80 pt-4 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('admin.plannerIntegration.fieldMappingTitle')}
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {fieldMappingRows.map((row) => (
            <div key={row.id}>
              <div className={label}>{row.label}</div>
              <CustomSelect
                className="w-full"
                options={processSetupFieldMappingSelectOptions(row.optionsKind, fieldMappingOptionLists)}
                searchPlaceholder={t('admin.plannerIntegration.searchField')}
                searchable
                title={row.label}
                value={row.value || ''}
                onChange={(v) => row.setter(v)}
              />
            </div>
          ))}
        </div>
      </div>

      <TrackerEmbeddedTestingRulesPanel
        allFieldSelectOptions={allFieldSelectOptions}
        embeddedTestingOnlyJoins={embeddedTestingOnlyJoins}
        embeddedTestingOnlyRules={embeddedTestingOnlyRules}
        fieldClass={fieldClass}
        fieldRows={fieldRows}
        mutedClass={muted}
        setEmbeddedTestingOnlyJoins={setEmbeddedTestingOnlyJoins}
        setEmbeddedTestingOnlyRules={setEmbeddedTestingOnlyRules}
      />
    </>
  );
}
