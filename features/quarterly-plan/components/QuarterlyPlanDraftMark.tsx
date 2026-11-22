'use client';

import { observer } from 'mobx-react-lite';

import { useI18n } from '@/contexts/LanguageContext';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { draftMarkOf } from '../quarterlyPlanBoardModel';

/** Метка строки, которую добавил, изменил или убрал показанный черновик агента (QM9); иначе ничего. */
export const QuarterlyPlanDraftMark = observer(function QuarterlyPlanDraftMark({ id }: { id: string }) {
  const { t } = useI18n();
  const { draftMarks } = useQuarterlyPlanBoard();
  const kind = draftMarkOf(draftMarks, id);
  if (!kind) return null;
  return (
    <span
      className={`shrink-0 rounded border border-dashed px-1 text-[10px] font-medium leading-4 ${
        kind === 'removed'
          ? 'border-red-400 text-red-700 dark:border-red-400/70 dark:text-red-300'
          : 'border-blue-400 text-blue-700 dark:border-blue-400/70 dark:text-blue-200'
      }`}
    >
      {t(`quarterlyPlan.draft.mark.${kind}`)}
    </span>
  );
});
