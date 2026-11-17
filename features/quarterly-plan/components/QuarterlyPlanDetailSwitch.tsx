'use client';

import { useI18n } from '@/contexts/LanguageContext';

import { QUARTER_DETAIL_LEVELS, type QuarterDetailLevel } from '../quarterlyPlanDetail';

interface QuarterlyPlanDetailSwitchProps {
  value: QuarterDetailLevel;
  onChange: (level: QuarterDetailLevel) => void;
}

/**
 * Переключатель вида доски (QZ1): квартал — что и когда поставляем, недели — кто на чём по неделям,
 * дни — каждый день и все задачи. Три кнопки от общего к подробному; между ними зазор — hover соседней кнопки
 * не сливается с выбранной.
 */
export function QuarterlyPlanDetailSwitch({ value, onChange }: QuarterlyPlanDetailSwitchProps) {
  const { t } = useI18n();
  return (
    <div
      aria-label={t('quarterlyPlan.detail.title')}
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-black/[0.05] p-0.5 dark:bg-white/[0.08]"
      role="radiogroup"
    >
      {QUARTER_DETAIL_LEVELS.map((level) => (
        <button
          key={level}
          aria-checked={level === value}
          className={`h-7 cursor-pointer whitespace-nowrap rounded-md px-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] ${
            level === value
              ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-50'
              : 'text-gray-600 hover:bg-black/[0.05] hover:text-gray-900 active:bg-black/[0.1] dark:text-gray-300 dark:hover:bg-white/[0.08] dark:hover:text-gray-50'
          }`}
          role="radio"
          title={t(`quarterlyPlan.detail.${level}Hint`)}
          type="button"
          onClick={() => onChange(level)}
        >
          {t(`quarterlyPlan.detail.${level}`)}
        </button>
      ))}
    </div>
  );
}
