'use client';

import type { QuarterlyPlanDraftReview } from '../QuarterlyPlanBoardContext';
import type { QuarterlyPlanDraftItem } from '@/lib/quarterlyPlans/quarterlyPlanDraftItems';

import { useI18n } from '@/contexts/LanguageContext';
import { TaskBarPendingApprovalToolbar } from '@/features/task/components/TaskBar/TaskBarPendingApprovalToolbar';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { draftMarkOf } from '../quarterlyPlanBoardModel';

/** Тон подписи пункта — как у предложений агента на доске спринта: новое зелёное, убранное красное. */
const CHANGE_TONE: Record<QuarterlyPlanDraftItem['change'], { className: string; icon: string | null }> = {
  added: { className: 'text-green-700 dark:text-green-400', icon: 'plan-add' },
  changed: { className: '', icon: null },
  removed: { className: 'text-red-600 dark:text-red-400', icon: 'trash' },
};

/** Пункты черновика у сущности доски: свой и, у полосы, связи, которые в неё ведут. */
export function draftItemsOf(review: QuarterlyPlanDraftReview | null, id: string): QuarterlyPlanDraftItem[] {
  if (!review) return [];
  const own = review.items.get(id);
  return [...(own ? [own] : []), ...(review.linkItemsByAssignment.get(id) ?? [])];
}

interface QuarterlyPlanDraftItemToolbarProps {
  /** Скрыть, пока сущность несут или растягивают. */
  hidden?: boolean;
  /** Сущность доски; у полосы — ещё и пункты-связи, которые в неё ведут. */
  id: string;
  /** `below` — под полосой или заметкой; `flow` — в строке направления или эпика. */
  placement: 'below' | 'flow';
}

/**
 * ✓/✗ пункта черновика агента на доске квартала (QM10) — тот же тулбар, что у предложений агента на доске спринта:
 * переход «‹ 1/N ›» находит его в DOM, решение о пункте уходит сразу. Пункта нет — ничего.
 */
export function QuarterlyPlanDraftItemToolbar({ hidden = false, id, placement }: QuarterlyPlanDraftItemToolbarProps) {
  const { t } = useI18n();
  const { draftMarks, draftReview } = useQuarterlyPlanBoard();
  const items = draftItemsOf(draftReview, id);
  if (!draftReview || hidden || items.length === 0) return null;
  const toolbars = items.map((item) => {
    const tone = CHANGE_TONE[item.change];
    // «Изменено» уточняется по плану после черновика: одна привязка к трекеру — «прилинковано».
    const mark = item.change === 'changed' ? (draftMarkOf(draftMarks, item.id) ?? item.change) : item.change;
    return (
      <TaskBarPendingApprovalToolbar
        key={item.id}
        clientBrand={draftReview.brand ?? undefined}
        commentId={item.id}
        label={`${t(`quarterlyPlan.draft.itemKind.${item.kind}`)}: ${t(`quarterlyPlan.draft.mark.${mark}`)}`}
        labelClassName={tone.className}
        labelIcon={tone.icon}
        placement="flow"
        onApprove={draftReview.onApprove}
        onReject={draftReview.onReject}
      />
    );
  });
  if (placement === 'flow') return <span className="flex shrink-0 items-center gap-1">{toolbars}</span>;
  return (
    // Под полосой или заметкой: нажатие по тулбару не начинает перенос того, под чем он стоит.
    <div
      className="pointer-events-auto absolute right-0 top-full mt-1 flex flex-col items-end gap-1"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {toolbars}
    </div>
  );
}
