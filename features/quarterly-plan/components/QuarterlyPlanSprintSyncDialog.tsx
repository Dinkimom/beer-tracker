'use client';

import type { QuarterlyPlanSprintSyncChoice } from '../useQuarterlyPlanSprintSync';
import type { QuarterlyPlanSprintDrift } from '@/lib/quarterlyPlans/quarterlyPlanSprintSync';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';

import { formatDateRange } from '../quarterlyPlanBoardModel';

import { QuarterlyPlanDialog } from './QuarterlyPlanDialog';

/** Какие даты верные: плана (карточка в спринте сдвигается) или спринта (полоса в плане подстраивается). */
type Truth = 'plan' | 'sprint';

const CHOICE_OF_TRUTH: Record<Truth, QuarterlyPlanSprintSyncChoice['to']> = { plan: 'sprint', sprint: 'plan' };

interface QuarterlyPlanSprintSyncDialogProps {
  busy: boolean;
  drifts: readonly QuarterlyPlanSprintDrift[];
  /** Открыт; каждое открытие — новый `key` у диалога, выбор начинается заново. */
  open: boolean;
  onApply: (choices: QuarterlyPlanSprintSyncChoice[]) => void;
  onClose: () => void;
}

/** Что можно выбрать верным: даты плана — если карточку можно сдвинуть, даты спринта — если полосу можно подогнать. */
function blockerOf(drift: QuarterlyPlanSprintDrift, truth: Truth) {
  const target = truth === 'plan' ? drift.toSprint : drift.toPlan;
  return 'blocker' in target ? target.blocker : null;
}

/**
 * Синхронизация плана и спринта (QK9): у каждой задачи с расхождением — даты в плане и в спринте. Клик по датам
 * выбирает верные, вторая сторона подстроится; снятая галочка — задачу не трогаем. Не всё сразу: применяется
 * только отмеченное.
 */
export function QuarterlyPlanSprintSyncDialog({ busy, drifts, open, onApply, onClose }: QuarterlyPlanSprintSyncDialogProps) {
  const { t } = useI18n();
  const [truths, setTruths] = useState<ReadonlyMap<string, Truth>>(
    () =>
      new Map(
        drifts.flatMap((drift) => {
          const truth: Truth | null = blockerOf(drift, 'plan') ? (blockerOf(drift, 'sprint') ? null : 'sprint') : 'plan';
          return truth ? [[drift.epicId, truth] as const] : [];
        })
      )
  );
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(truths.keys()));
  const choices = drifts.flatMap((drift): QuarterlyPlanSprintSyncChoice[] => {
    const truth = truths.get(drift.epicId);
    return truth && checked.has(drift.epicId) ? [{ drift, to: CHOICE_OF_TRUTH[truth] }] : [];
  });
  const toggle = (id: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const dates = (drift: QuarterlyPlanSprintDrift, truth: Truth) => {
    const blocker = blockerOf(drift, truth);
    const chosen = truths.get(drift.epicId) === truth;
    const range = truth === 'plan' ? drift.plan : drift.sprint;
    return (
      <button
        aria-pressed={chosen}
        className={`w-full cursor-pointer rounded-md px-2 py-1 text-left text-sm tabular-nums transition-colors disabled:cursor-not-allowed ${
          chosen
            ? 'bg-blue-500/10 font-medium text-blue-700 ring-1 ring-blue-500/50 dark:bg-blue-400/15 dark:text-blue-200'
            : 'text-ds-text-muted hover:bg-black/[0.04] active:bg-black/[0.07] disabled:hover:bg-transparent dark:hover:bg-white/[0.06]'
        }`}
        disabled={blocker !== null}
        title={blocker ? t(`quarterlyPlan.sync.blocker.${blocker}`) : truth === 'sprint' ? drift.sprint.sprintName : undefined}
        type="button"
        onClick={() => {
          setTruths((current) => new Map(current).set(drift.epicId, truth));
          setChecked((current) => new Set(current).add(drift.epicId));
        }}
      >
        {formatDateRange(range.startDate, range.endDate)}
      </button>
    );
  };

  return (
    <QuarterlyPlanDialog
      className="max-h-[80vh] max-w-xl"
      description={t('quarterlyPlan.sync.hint')}
      open={open}
      title={t('quarterlyPlan.sync.title')}
      onClose={onClose}
    >
          {drifts.length === 0 ? (
            <p className="text-sm text-ds-text-muted">{t('quarterlyPlan.sync.empty')}</p>
          ) : (
            <div className="scrollbar-thin-custom -mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
              <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_7rem_7rem] items-center gap-x-3 gap-y-1">
                <span />
                <span className="text-xs text-ds-text-muted">{t('quarterlyPlan.sync.columnTask')}</span>
                <span className="px-2 text-xs text-ds-text-muted">{t('quarterlyPlan.sync.columnPlan')}</span>
                <span className="px-2 text-xs text-ds-text-muted">{t('quarterlyPlan.sync.columnSprint')}</span>
                {drifts.map((drift) => (
                  <div key={drift.epicId} className="contents">
                    <input
                      aria-label={drift.title}
                      checked={checked.has(drift.epicId)}
                      className="h-4 w-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                      disabled={!truths.has(drift.epicId)}
                      type="checkbox"
                      onChange={() => toggle(drift.epicId)}
                    />
                    <span className="truncate text-sm text-gray-900 dark:text-gray-100" title={drift.issueKey}>
                      {drift.title}
                    </span>
                    {dates(drift, 'plan')}
                    {dates(drift, 'sprint')}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button disabled={busy || choices.length === 0} onClick={() => onApply(choices)}>
              {t(busy ? 'quarterlyPlan.sync.applying' : 'quarterlyPlan.sync.apply', { count: choices.length })}
            </Button>
          </div>
    </QuarterlyPlanDialog>
  );
}
