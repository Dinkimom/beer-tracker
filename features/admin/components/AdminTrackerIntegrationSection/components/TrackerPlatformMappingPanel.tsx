'use client';

import type { TrackerPlatformMappingRow } from '../trackerPlatformMappingHelpers';
import type {
  PlatformMappingFilter,
  PlatformValueMapFormRow,
} from '../types';

import { useMemo } from 'react';

import {
  CustomSelect,
  type CustomSelectOption,
} from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import { TrackerPlatformMappingValuesSection } from './TrackerPlatformMappingValuesSection';

const PLATFORM_SELECT_OPTIONS: CustomSelectOption<string>[] = [
  { label: 'frontend', value: 'Web' },
  { label: 'backend', value: 'Back' },
  { label: 'qa', value: 'QA' },
  { label: 'mobile', value: 'DevOps' },
];

interface TrackerPlatformMappingPanelProps {
  fieldSelectOptions: CustomSelectOption<string>[];
  labelClass: string;
  mutedClass: string;
  platformFieldId: string;
  platformFieldValues: string[];
  platformFieldValuesLoading: boolean;
  platformMappingFilter: PlatformMappingFilter;
  platformValueMap: PlatformValueMapFormRow[];
  stats: { changed: number; unmapped: number };
  tabBtnBase: string;
  tabBtnIdle: string;
  visibleRows: TrackerPlatformMappingRow[];
  onPlatformFieldChange: (fieldId: string) => void;
  onPlatformMappingFilterChange: (filter: PlatformMappingFilter) => void;
  onRowPlatformChange: (trackerValue: string, platform: string) => void;
}

export function TrackerPlatformMappingPanel({
  fieldSelectOptions,
  labelClass,
  mutedClass,
  onPlatformFieldChange,
  onPlatformMappingFilterChange,
  onRowPlatformChange,
  platformFieldId,
  platformFieldValues,
  platformFieldValuesLoading,
  platformMappingFilter,
  platformValueMap,
  stats,
  tabBtnBase,
  tabBtnIdle,
  visibleRows,
}: TrackerPlatformMappingPanelProps) {
  const { t } = useI18n();
  const platformSelectValue = fieldSelectOptions.some((option) => option.value === platformFieldId)
    ? platformFieldId
    : '';

  const platformSelectOptions = useMemo((): CustomSelectOption<string>[] => {
    return [
      {
        label: t('admin.plannerIntegration.platformMapping.doNotMap'),
        value: '',
      },
      ...PLATFORM_SELECT_OPTIONS,
    ];
  }, [t]);

  const filterTabs = useMemo(
    () =>
      [
        { id: 'all' as const, label: t('admin.plannerIntegration.platformMapping.filterAll') },
        {
          id: 'problematic' as const,
          label: t('admin.plannerIntegration.platformMapping.filterUnmapped', {
            count: stats.unmapped,
          }),
        },
        {
          id: 'changed' as const,
          label: t('admin.plannerIntegration.platformMapping.filterChanged', {
            count: stats.changed,
          }),
        },
      ] as const,
    [stats.changed, stats.unmapped, t],
  );

  return (
    <>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('admin.plannerIntegration.platformMapping.title')}
      </h3>
      <p className={`mt-0.5 text-xs ${mutedClass}`}>
        {t('admin.plannerIntegration.platformMapping.subtitle')}
      </p>
      <div className="mt-3">
        <div className={labelClass}>
          {t('admin.plannerIntegration.platformMapping.platformFieldLabel')}
        </div>
        <CustomSelect
          className="w-full"
          options={fieldSelectOptions}
          searchPlaceholder={t(
            'admin.plannerIntegration.platformMapping.platformFieldSearch',
          )}
          searchable
          title={t('admin.plannerIntegration.platformMapping.platformFieldTitle')}
          value={platformSelectValue}
          onChange={(v) => {
            onPlatformFieldChange(v);
          }}
        />
      </div>
      {platformSelectValue ? (
        <div className="mt-3 overflow-hidden rounded-lg border border-gray-200/80 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-950/20">
          <div className="space-y-2">
            <TrackerPlatformMappingValuesSection
              filterTabs={filterTabs}
              mutedClass={mutedClass}
              platformFieldValues={platformFieldValues}
              platformFieldValuesLoading={platformFieldValuesLoading}
              platformMappingFilter={platformMappingFilter}
              platformSelectOptions={platformSelectOptions}
              platformValueMap={platformValueMap}
              tabBtnBase={tabBtnBase}
              tabBtnIdle={tabBtnIdle}
              visibleRows={visibleRows}
              onPlatformMappingFilterChange={onPlatformMappingFilterChange}
              onRowPlatformChange={onRowPlatformChange}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
