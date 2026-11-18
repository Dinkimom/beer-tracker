'use client';

import type { TaskCardSlotBoardSelection } from './TaskCardSlotBoardZone';
import type { TaskCardFieldId, TaskCardPresentation, TaskCardSlotLayout } from '@/lib/taskCard/taskCardSlots';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { updateTaskCardCustomField, updateTaskCardFieldPlacement } from '@/lib/taskCard/taskCardSlotEdits';
import { taskCardFieldPresentations } from '@/lib/taskCard/taskCardSlots';

import { KeepWhenSlotHiddenToggle } from './KeepWhenSlotHiddenToggle';
import { taskCardFieldLabel, taskCardPresentationLabel } from './taskCardSlotLabels';
import { TaskCardSlotValueLabels } from './TaskCardSlotValueLabels';

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
          <Button
            key={presentation}
            aria-pressed={placement.presentation === presentation}
            size="sm"
            variant={placement.presentation === presentation ? 'primary' : 'outline'}
            onClick={() => {
              onChange(updateTaskCardFieldPlacement(layout, selectedField, { presentation }));
            }}
          >
            {taskCardPresentationLabel(selectedField, presentation, t)}
          </Button>
        ))}
      </div>
      <KeepWhenSlotHiddenToggle
        checked={placement.keepWhenSlotHidden === true}
        t={t}
        onChange={(keepWhenSlotHidden) => {
          onChange(updateTaskCardFieldPlacement(layout, selectedField, { keepWhenSlotHidden }));
        }}
      />
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
        {(['tag', 'text', 'avatars'] as const satisfies readonly TaskCardPresentation[]).map((choice) => (
          <Button
            key={choice}
            aria-pressed={placement.presentation === choice}
            size="sm"
            variant={placement.presentation === choice ? 'primary' : 'outline'}
            onClick={() => {
              onChange(updateTaskCardCustomField(layout, selectedId, { presentation: choice }));
            }}
          >
            {taskCardPresentationLabel('status', choice, t)}
          </Button>
        ))}
      </div>
      <KeepWhenSlotHiddenToggle
        checked={placement.keepWhenSlotHidden === true}
        t={t}
        onChange={(keepWhenSlotHidden) => {
          onChange(updateTaskCardCustomField(layout, selectedId, { keepWhenSlotHidden }));
        }}
      />
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

