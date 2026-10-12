'use client';

import type { TaskCardSlotBoardSelection } from './TaskCardSlotBoardZone';
import type { TaskCardHideWhen, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';
import type { PlannerTrackerField } from '@/lib/tracker/plannerTrackerFieldOptions';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { ZIndex } from '@/constants/zIndex';
import { useI18n } from '@/contexts/LanguageContext';
import { fetchPlannerTrackerFieldOptions } from '@/lib/api/plannerTrackerFields';
import { TASK_CARD_HIDE_WHENS } from '@/lib/taskCard/taskCardSlots';
import { plannerTrackerFieldIsFixedList } from '@/lib/tracker/plannerTrackerFieldOptions';

import { TaskCardCustomFieldsSection } from './TaskCardCustomFieldsSection';
import { TaskCardSlotBoard } from './TaskCardSlotBoard';
import { TaskCardSlotInspector } from './TaskCardSlotInspector';
import { TaskCardSlotPreviewGallery } from './TaskCardSlotPreviewGallery';

const HIDE_PARTS = [
  { flag: 'hideEyebrow', labelKey: 'settings.planningTab.cardSlots.hidePart.eyebrow' },
  { flag: 'hideTitleLead', labelKey: 'settings.planningTab.cardSlots.hidePart.titleLead' },
  { flag: 'hideFooter', labelKey: 'settings.planningTab.cardSlots.hidePart.footer' },
] as const;

interface FixedListOptions {
  options: readonly string[];
  status: 'idle' | 'loading' | 'ready';
}

interface TaskCardDisplaySettingsPanelProps {
  fields?: readonly PlannerTrackerField[];
  fieldsStatus?: 'loading' | 'ready' | 'unavailable';
  layout: TaskCardSlotLayout;
  organizationId?: string | null;
  onChange: (layout: TaskCardSlotLayout) => void;
}

export function TaskCardDisplaySettingsPanel({
  fields = [],
  fieldsStatus = 'ready',
  layout,
  onChange,
  organizationId = null,
}: TaskCardDisplaySettingsPanelProps) {
  const { t } = useI18n();
  const hideWhenOptions = TASK_CARD_HIDE_WHENS.map((value) => ({
    label: t(`settings.planningTab.cardSlots.hideWhen.${value}`),
    value,
  }));
  const [selected, setSelected] = useState<TaskCardSlotBoardSelection>(null);
  const catalogField = selectedTrackerField(fields, selected);
  const fixedList = useFixedListOptions(organizationId ?? null, catalogField);
  const sample = previewSample(selected, layout, fixedList.options);

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ds-text-muted">{t('settings.planningTab.cardSlots.boardHint')}</p>
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
        <TaskCardSlotBoard layout={layout} selected={selected} onChange={onChange} onSelect={setSelected} />
        <TaskCardSlotInspector
          layout={layout}
          options={fixedList.options}
          optionsStatus={fixedList.status}
          selected={selected}
          onChange={onChange}
        />
      </div>
      <TaskCardCustomFieldsSection
        fields={fields}
        fieldsStatus={fieldsStatus}
        layout={layout}
        onChange={onChange}
      />
      <div className="grid items-start gap-6 border-t border-gray-200 pt-4 lg:grid-cols-[minmax(0,1fr)_22rem] dark:border-gray-700">
        <TaskCardSlotPreviewGallery layout={layout} sample={sample} />
        <section className="space-y-3">
          <h4 className="text-[11px] font-medium uppercase tracking-wide text-ds-text-muted">
            {t('settings.planningTab.cardSlots.densityHeading')}
          </h4>
          {HIDE_PARTS.map((part) => (
            <label key={part.flag} className="block space-y-1.5">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t(part.labelKey)}</span>
              <CustomSelect<TaskCardHideWhen>
                className="w-full"
                menuFitContent
                menuZIndex={ZIndex.overlay}
                options={hideWhenOptions}
                title={t(part.labelKey)}
                value={layout[part.flag]}
                onChange={(value) => {
                  onChange({ ...layout, [part.flag]: value });
                }}
              />
            </label>
          ))}
        </section>
      </div>
    </div>
  );
}

function selectedTrackerField(
  fields: readonly PlannerTrackerField[],
  selected: TaskCardSlotBoardSelection
): PlannerTrackerField | null {
  if (selected?.kind !== 'custom') {
    return null;
  }
  for (const field of fields) {
    if (field.id === selected.fieldId) {
      return field;
    }
  }
  return null;
}

function useFixedListOptions(
  organizationId: string | null,
  field: PlannerTrackerField | null
): FixedListOptions {
  const inline = field?.options ?? [];
  const shouldFetch = Boolean(organizationId && field && inline.length === 0 && plannerTrackerFieldIsFixedList(field));
  const query = useQuery({
    enabled: shouldFetch,
    queryFn: () => fetchPlannerTrackerFieldOptions(organizationId ?? '', field?.id ?? ''),
    queryKey: ['planner-tracker-field-options', organizationId, field?.id],
    staleTime: 5 * 60 * 1000,
  });
  if (!field || !plannerTrackerFieldIsFixedList(field)) {
    return { options: [], status: 'idle' };
  }
  if (inline.length > 0) {
    return { options: inline, status: 'ready' };
  }
  if (query.isLoading) {
    return { options: [], status: 'loading' };
  }
  return { options: query.data ?? [], status: 'ready' };
}

function previewSample(
  selected: TaskCardSlotBoardSelection,
  layout: TaskCardSlotLayout,
  options: readonly string[]
): { fieldId: string; value: string } | null {
  if (selected?.kind !== 'custom' || options.length === 0) {
    return null;
  }
  const placement = layout.customPlacements.find((item) => item.fieldId === selected.fieldId);
  return { fieldId: selected.fieldId, value: preferredOption(placement?.valueLabels, options) };
}

function preferredOption(labels: Readonly<Record<string, string>> | undefined, options: readonly string[]): string {
  for (const option of options) {
    const short = labels?.[option];
    if (short && short.trim()) {
      return option;
    }
  }
  return options[0];
}
