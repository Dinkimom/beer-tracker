'use client';

import type { QuarterlyPlanPhase } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';

/** Подпись фазы на полосе проработки (QG1); у поставки подписи нет — это обычная полоса. */
export function QuarterlyPlanPhaseTag({ phase }: { phase: QuarterlyPlanPhase }) {
  const { t } = useI18n();
  if (phase !== 'discovery') return null;
  return (
    <span className="shrink-0 rounded border border-current/30 px-1 text-[10px] font-semibold uppercase leading-4 tracking-wide opacity-70">
      {t('quarterlyPlan.phase.discovery')}
    </span>
  );
}
