'use client';

import type { PlatformValueMapFormRow } from '../types';
import type { CustomSelectOption } from '@/components/CustomSelect';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import {
  platformMappingBadgeClass,
  platformMappingStatusLabel,
  type TrackerPlatformMappingRow,
} from '../trackerPlatformMappingHelpers';

type PlatformMappingFilterTabId = 'all' | 'changed' | 'problematic';

interface TrackerPlatformMappingValuesSectionProps {
  filterTabs: ReadonlyArray<{ id: PlatformMappingFilterTabId; label: string }>;
  mutedClass: string;
  platformFieldValues: string[];
  platformMappingFilter: PlatformMappingFilterTabId;
  platformSelectOptions: CustomSelectOption<string>[];
  platformValueMap: PlatformValueMapFormRow[];
  tabBtnBase: string;
  tabBtnIdle: string;
  visibleRows: TrackerPlatformMappingRow[];
  onPlatformMappingFilterChange: (filter: PlatformMappingFilterTabId) => void;
  onRowPlatformChange: (trackerValue: string, platform: string) => void;
}

export function TrackerPlatformMappingValuesSection({
  filterTabs,
  mutedClass,
  onPlatformMappingFilterChange,
  onRowPlatformChange,
  platformFieldValues,
  platformMappingFilter,
  platformSelectOptions,
  platformValueMap,
  tabBtnBase,
  tabBtnIdle,
  visibleRows,
}: TrackerPlatformMappingValuesSectionProps) {
  const { t } = useI18n();

  if (platformFieldValues.length === 0) {
    return (
      <p className={`text-xs ${mutedClass}`}>
        {t('admin.plannerIntegration.platformMapping.valuesLoadFailed')}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((opt) => (
          <button
            key={opt.id}
            className={`${tabBtnBase} px-2.5 py-1.5 text-xs ${
              platformMappingFilter === opt.id
                ? 'border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
                : `${tabBtnIdle} border border-transparent`
            }`}
            type="button"
            onClick={() => onPlatformMappingFilterChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {visibleRows.length === 0 ? (
          <p className={`text-xs ${mutedClass}`}>
            {t('admin.plannerIntegration.platformMapping.noRows')}
          </p>
        ) : null}
        {visibleRows.map((row) => {
          const mapped = platformValueMap.find((x) => x.trackerValue === row.trackerValue);
          const badgeClass = platformMappingBadgeClass(row);
          const statusLabel = platformMappingStatusLabel(row, t);
          return (
            <div
              key={row.trackerValue}
              className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_140px_220px]"
            >
              <div className="min-w-0 truncate rounded-md border border-gray-200 px-2.5 py-2 text-sm dark:border-gray-700">
                {row.trackerValue}
              </div>
              <div className="flex justify-start sm:justify-center">
                <span
                  className={`inline-flex min-w-[122px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-medium ${badgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>
              <CustomSelect
                className="w-full"
                options={platformSelectOptions}
                title={t('admin.plannerIntegration.platformMapping.platformForRow', {
                  value: row.trackerValue,
                })}
                value={mapped?.platform ?? ''}
                onChange={(next) => onRowPlatformChange(row.trackerValue, next ?? '')}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
