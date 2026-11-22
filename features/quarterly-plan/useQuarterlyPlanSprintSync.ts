'use client';

import type { QuarterlyPlanSprintDrift } from '@/lib/quarterlyPlans/quarterlyPlanSprintSync';
import type { QuarterlyPlan, QuarterlyPlanContent } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';

import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { shiftSprintCards } from '@/lib/beerTrackerApi';
import { assignmentSpanFields, updateAssignment } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { collectSprintDrifts } from '@/lib/quarterlyPlans/quarterlyPlanSprintSync';

/** Что сделать с расхождением: сдвинуть карточку по плану или поставить полосу на дни спринта (QK9). */
export interface QuarterlyPlanSprintSyncChoice {
  drift: QuarterlyPlanSprintDrift;
  to: 'plan' | 'sprint';
}

/**
 * Синхронизация плана и спринта (QK9): список расхождений — всех или задач выбранной строки — и применение
 * выбранного. В план правка уходит обычным сохранением плана, в спринт — переносом карточек на доске спринта.
 */
export function useQuarterlyPlanSprintSync(input: {
  /** false — доска только для просмотра (черновик агента, версия из истории): правка в план не прошла. */
  applyEdit: (edit: (content: QuarterlyPlanContent) => QuarterlyPlanContent) => boolean;
  plan: QuarterlyPlan | null;
  refreshSprintCards: () => Promise<void>;
  weeks: readonly QuarterWeek[];
}) {
  const { t } = useI18n();
  const { applyEdit, plan, refreshSprintCards, weeks } = input;
  /** Открыт список: задачи этих строк (эпик, направление, задача) или все — null. */
  const [scope, setScope] = useState<{ rowIds: ReadonlySet<string> | null } | null>(null);
  /** Номер открытия: ключ диалога, чтобы выбор в нём начинался заново. */
  const [openCount, setOpenCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const allDrifts = useMemo(() => (plan ? collectSprintDrifts(plan, weeks) : []), [plan, weeks]);
  const drifts = useMemo(
    () => (plan && scope?.rowIds ? collectSprintDrifts(plan, weeks, scope.rowIds) : allDrifts),
    [allDrifts, plan, scope, weeks]
  );

  const apply = useCallback(
    async (choices: readonly QuarterlyPlanSprintSyncChoice[]) => {
      const toPlan = choices.flatMap(({ drift, to }) => (to === 'plan' && 'span' in drift.toPlan ? [drift.toPlan] : []));
      // В тост идёт только применённое: при показанном черновике агента правка в план не проходит.
      const appliedToPlan =
        toPlan.length > 0 &&
        applyEdit((content) =>
          toPlan.reduce((next, { assignmentId, span }) => updateAssignment(next, assignmentId, assignmentSpanFields(span)), content)
        )
          ? toPlan.length
          : 0;
      const bySprint = new Map<number, Array<{ startDay: number; taskId: string }>>();
      for (const { drift, to } of choices) {
        if (to !== 'sprint' || !('startDay' in drift.toSprint)) continue;
        const moves = bySprint.get(drift.sprint.sprintId) ?? [];
        moves.push({ startDay: drift.toSprint.startDay, taskId: drift.issueKey });
        bySprint.set(drift.sprint.sprintId, moves);
      }
      setBusy(true);
      try {
        let moved = 0;
        for (const [sprintId, moves] of bySprint) moved += await shiftSprintCards(sprintId, moves);
        if (bySprint.size > 0) await refreshSprintCards();
        if (appliedToPlan + moved > 0) toast.success(t('quarterlyPlan.sync.done', { count: appliedToPlan + moved }));
        if (appliedToPlan === toPlan.length) setScope(null);
      } catch {
        toast.error(t('quarterlyPlan.sync.failed'));
      } finally {
        setBusy(false);
      }
    },
    [applyEdit, refreshSprintCards, t]
  );

  return {
    apply: (choices: readonly QuarterlyPlanSprintSyncChoice[]) => {
      apply(choices).catch(() => undefined);
    },
    busy,
    close: () => setScope(null),
    /** Сколько расхождений на всём плане — для кнопки на панели. */
    count: allDrifts.length,
    drifts,
    open: (rowIds: ReadonlySet<string> | null = null) => {
      setScope({ rowIds });
      setOpenCount((count) => count + 1);
    },
    openCount,
    opened: scope !== null,
  };
}
