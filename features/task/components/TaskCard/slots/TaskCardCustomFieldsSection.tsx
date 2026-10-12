'use client';

import type { TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { PlannerTrackerField } from '@/lib/tracker/plannerTrackerFieldOptions';

import { useMemo } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { addTaskCardCustomField } from '@/lib/taskCard/taskCardSlotEdits';
import { plannerTrackerFieldOptions } from '@/lib/tracker/plannerTrackerFieldOptions';

interface TaskCardCustomFieldsSectionProps {
  fields: readonly PlannerTrackerField[];
  fieldsStatus: 'loading' | 'ready' | 'unavailable';
  layout: TaskCardSlotLayout;
  onChange: (layout: TaskCardSlotLayout) => void;
}

export function TaskCardCustomFieldsSection({
  fields,
  fieldsStatus,
  layout,
  onChange,
}: TaskCardCustomFieldsSectionProps) {
  const { t } = useI18n();
  const addedIds = useMemo(
    () => new Set(layout.customPlacements.map((placement) => placement.fieldId)),
    [layout.customPlacements]
  );
  const options = useMemo(() => plannerTrackerFieldOptions(fields, addedIds), [addedIds, fields]);
  const selectOptions = useMemo(
    () => options.map((option) => ({ label: option.label, value: option.id })),
    [options]
  );
  const searchPlaceholder = t('settings.planningTab.cardSlots.customFieldSearch');

  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-medium uppercase tracking-wide text-ds-text-muted">
        {t('settings.planningTab.cardSlots.customFieldsHeading')}
      </h4>
      <p className="text-xs leading-relaxed text-ds-text-muted">
        {t('settings.planningTab.cardSlots.customFieldsHint')}
      </p>
      <CustomSelect
        className="w-full"
        disabled={fieldsStatus !== 'ready' || selectOptions.length === 0}
        menuZIndex={ZIndex.overlay}
        options={selectOptions}
        renderTriggerValue={() => (
          <span className="min-w-0 truncate text-gray-500 dark:text-gray-400">{searchPlaceholder}</span>
        )}
        searchEmptyMessage={t('settings.planningTab.cardSlots.customFieldSearchEmpty')}
        searchPlaceholder={searchPlaceholder}
        searchable
        title={t('settings.planningTab.cardSlots.customFieldsHeading')}
        value=""
        onChange={(fieldId) => {
          const option = options.find((item) => item.id === fieldId);
          if (!option) {
            return;
          }
          onChange(addTaskCardCustomField(layout, { fieldId: option.id, label: option.name }));
        }}
      />
      {fieldsStatus === 'loading' ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('common.loading')}</p>
      ) : null}
      {fieldsStatus === 'unavailable' || (fieldsStatus === 'ready' && fields.length === 0) ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('settings.planningTab.cardSlots.customFieldsNone')}
        </p>
      ) : null}
    </section>
  );
}
