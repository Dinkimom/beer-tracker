'use client';

import type { TaskCardSlotBoardSelection } from './TaskCardSlotBoardZone';
import type { TaskCardFieldId, TaskCardPresentation, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';

import { useI18n } from '@/contexts/LanguageContext';
import { updateTaskCardCustomField, updateTaskCardFieldPlacement } from '@/lib/taskCard/taskCardSlotEdits';
import { taskCardFieldPresentations } from '@/lib/taskCard/taskCardSlots';

import { taskCardFieldLabel, taskCardPresentationLabel } from './taskCardSlotLabels';
import { TaskCardSlotValueLabels } from './TaskCardSlotValueLabels';

const LOOK_CLASS =
  'cursor-pointer rounded-md border px-2 py-0.5 text-xs font-medium transition-all duration-200 active:scale-[0.98]';

interface TaskCardSlotInspectorProps {
  layout: TaskCardSlotLayout;
  options: readonly string[];
  optionsStatus: 'idle' | 'loading' | 'ready';
  selected: TaskCardSlotBoardSelection;
  onChange: (layout: TaskCardSlotLayout) => void;
}

export function TaskCardSlotInspector({
  layout,
  onChange,
  options,
  optionsStatus,
  selected,
}: TaskCardSlotInspectorProps) {
  const { t } = useI18n();
  const frame = selected ? '' : 'hidden md:block';
  return (
    <aside
      className={`min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40 md:sticky md:top-0 md:max-h-[calc(90vh-7rem)] md:overflow-y-auto ${frame}`}
      data-task-card-inspector=""
    >
      {selected?.kind === 'builtin' ? renderBuiltin(layout, selected.field, onChange, t) : null}
      {selected?.kind === 'custom'
        ? renderCustom(layout, selected.fieldId, options, optionsStatus, onChange, t)
        : null}
      {selected ? null : (
        <p className="text-sm leading-relaxed text-ds-text-muted">{t('settings.planningTab.cardSlots.inspectorEmpty')}</p>
      )}
    </aside>
  );
}

function renderBuiltin(
  layout: TaskCardSlotLayout,
  selectedField: TaskCardFieldId,
  onChange: (layout: TaskCardSlotLayout) => void,
  t: (key: string, params?: Record<string, number | string>) => string
) {
  const placement = layout.placements.find((item) => item.field === selectedField);
  if (!placement) {
    return null;
  }
  const label = taskCardFieldLabel(selectedField, t);
  const choices = taskCardFieldPresentations(selectedField).filter((presentation) => presentation !== 'hidden');
  return (
    <div className="space-y-3">
      <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100" title={label}>
        {label}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((presentation) => (
          <button
            key={presentation}
            aria-pressed={placement.presentation === presentation}
            className={lookClass(placement.presentation === presentation)}
            type="button"
            onClick={() => {
              onChange(updateTaskCardFieldPlacement(layout, selectedField, { presentation }));
            }}
          >
            {taskCardPresentationLabel(selectedField, presentation, t)}
          </button>
        ))}
      </div>
    </div>
  );
}

function renderCustom(
  layout: TaskCardSlotLayout,
  selectedId: string,
  options: readonly string[],
  optionsStatus: 'idle' | 'loading' | 'ready',
  onChange: (layout: TaskCardSlotLayout) => void,
  t: (key: string, params?: Record<string, number | string>) => string
) {
  const placement = layout.customPlacements.find((item) => item.fieldId === selectedId);
  if (!placement) {
    return null;
  }
  const presentation = placement.presentation === 'tag' ? 'tag' : 'text';
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('settings.planningTab.cardSlots.customFieldName')}
        </span>
        <input
          className="w-full cursor-text rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          value={placement.label}
          onBlur={(event) => {
            const next = event.target.value.trim().slice(0, 80);
            if (next !== placement.label) {
              onChange(updateTaskCardCustomField(layout, selectedId, { label: next }));
            }
          }}
          onChange={(event) => {
            onChange(updateTaskCardCustomField(layout, selectedId, { label: event.target.value.slice(0, 80) }));
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {(['tag', 'text'] as const satisfies readonly TaskCardPresentation[]).map((choice) => (
          <button
            key={choice}
            aria-pressed={placement.presentation === choice}
            className={lookClass(placement.presentation === choice)}
            type="button"
            onClick={() => {
              onChange(updateTaskCardCustomField(layout, selectedId, { presentation: choice }));
            }}
          >
            {taskCardPresentationLabel('status', choice, t)}
          </button>
        ))}
      </div>
      <TaskCardSlotValueLabels
        fieldId={placement.fieldId}
        fieldLabel={placement.label}
        labels={placement.valueLabels}
        options={options}
        presentation={presentation}
        status={optionsStatus}
        onChange={(option, label) => {
          onChange(updateTaskCardCustomField(layout, selectedId, { valueLabel: { label, option } }));
        }}
      />
    </div>
  );
}

function lookClass(isActive: boolean): string {
  if (isActive) {
    return `${LOOK_CLASS} border-blue-700/20 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:border-blue-400/35 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30`;
  }
  return `${LOOK_CLASS} border-gray-300 bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600`;
}
