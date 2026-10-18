'use client';

import { useI18n } from '@/contexts/LanguageContext';

export function GoalPlanPatchUpdateDiff({ fromText }: { fromText: string }) {
  const { t } = useI18n();
  return (
    <p className="ml-6 pb-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
      {t('sprintPlanner.swimlane.planPatch.goalUpdateWas', { from: fromText })}
    </p>
  );
}
