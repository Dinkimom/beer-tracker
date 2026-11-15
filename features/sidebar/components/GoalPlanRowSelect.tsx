'use client';

import { CustomSelect, type CustomSelectOption } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { goalPlanRowKey, type GoalPlanRowOption, type SprintGoalPlanRow } from '@/lib/sprintGoals/sprintGoalPlanRow';

interface GoalPlanRowSelectProps {
  canEdit: boolean;
  disabled?: boolean;
  /** Строки планов кварталов, которые задевает спринт. */
  options: readonly GoalPlanRowOption[];
  planRow: SprintGoalPlanRow | null;
  onChange: (planRow: SprintGoalPlanRow | null) => void;
}

function rowLabel(option: GoalPlanRowOption): string {
  return option.directionTitle ? `${option.directionTitle} › ${option.title}` : option.title;
}

/** Тихий триггер: в списке целей он читается как подпись, рамка появляется под курсором. */
const TRIGGER_CLASS =
  '-ml-1.5 !max-h-6 w-auto max-w-full !gap-1 !border-transparent !bg-transparent !px-1.5 text-xs !font-normal !shadow-none hover:!border-gray-300 hover:!bg-black/5 dark:hover:!border-gray-600 dark:hover:!bg-white/10';

/**
 * Строка квартального плана у цели спринта (QG5): эпик или направление. Цель без строки — влёт;
 * строки больше нет в плане — привязка висит, её видно пометкой и можно сменить или снять.
 */
export function GoalPlanRowSelect({ canEdit, disabled = false, onChange, options, planRow }: GoalPlanRowSelectProps) {
  const { t } = useI18n();
  const value = planRow ? goalPlanRowKey(planRow) : '';
  const byKey = new Map(options.map((option) => [goalPlanRowKey(option.planRow), option]));
  const selected = byKey.get(value);
  const removed = planRow !== null && !selected;

  if (!canEdit) {
    if (!planRow) return null;
    return (
      <span
        className={`block truncate text-xs ${removed ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'}`}
      >
        {selected ? rowLabel(selected) : t('sidebar.goalsTab.planRowRemoved')}
      </span>
    );
  }
  if (!planRow && options.length === 0) return null;

  const selectOptions: Array<CustomSelectOption<string>> = [
    { label: t('sidebar.goalsTab.planRowNone'), value: '' },
    ...options.map((option) => ({ label: rowLabel(option), value: goalPlanRowKey(option.planRow) })),
  ];

  return (
    <CustomSelect
      className={`${TRIGGER_CLASS} ${removed ? '!text-amber-700 dark:!text-amber-300' : '!text-gray-600 dark:!text-gray-300'}`}
      disabled={disabled}
      menuFitContent
      menuMinWidth={260}
      options={selectOptions}
      renderOption={(option) => {
        const row = byKey.get(option.value);
        return (
          <span className={`block truncate ${row?.directionTitle ? 'pl-4' : 'font-medium'}`}>
            {row ? row.title : option.label}
          </span>
        );
      }}
      renderTriggerValue={() => {
        if (removed) return <span className="truncate">{t('sidebar.goalsTab.planRowRemoved')}</span>;
        if (!selected) return <span className="truncate text-gray-500 dark:text-gray-400">{t('sidebar.goalsTab.planRowAdd')}</span>;
        return <span className="truncate">{rowLabel(selected)}</span>;
      }}
      searchEmptyMessage={t('sidebar.goalsTab.planRowSearchEmpty')}
      searchPlaceholder={t('sidebar.goalsTab.planRowSearch')}
      searchable
      size="compact"
      title={t('sidebar.goalsTab.planRowTitle')}
      value={value}
      onChange={(next) => onChange(byKey.get(next)?.planRow ?? null)}
    />
  );
}
