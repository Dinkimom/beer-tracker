'use client';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

/**
 * «Без оценки: N» рядом с суммами очков: неоценённые задачи в суммы не входят, объём без них занижен.
 * Шапка строки свимлейна, колонка канбана, плитки диаграммы сгорания и скор спринта.
 */
export function UnestimatedTasksCount({ count }: { count: number }) {
  const { t } = useI18n();
  if (count <= 0) return null;
  return (
    <TextTooltip content={t('common.unestimatedTooltip')}>
      <span className="text-amber-700 dark:text-amber-400" data-unestimated-count={count}>
        {t('common.unestimatedCount', { count })}
      </span>
    </TextTooltip>
  );
}
