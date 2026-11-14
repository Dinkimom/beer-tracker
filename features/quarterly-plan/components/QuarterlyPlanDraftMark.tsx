'use client';

import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { draftMarkOf } from '../quarterlyPlanBoardModel';

/** Метка строки, которую добавил или изменил показанный черновик агента (QM9); иначе ничего. */
export function QuarterlyPlanDraftMark({ id }: { id: string }) {
  const { t } = useI18n();
  const { draftMarks } = useQuarterlyPlanBoard();
  const kind = draftMarkOf(draftMarks, id);
  if (!kind) return null;
  return (
    <span className="shrink-0 rounded border border-dashed border-blue-400 px-1 text-[10px] font-medium leading-4 text-blue-700 dark:border-blue-400/70 dark:text-blue-200">
      {t(`quarterlyPlan.draft.mark.${kind}`)}
    </span>
  );
}
