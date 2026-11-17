'use client';

import type { QuarterDetailLevel } from '../quarterlyPlanDetail';
import type { QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLBAR_ITEM_IDLE, FLOATING_TOOLBAR_ITEM_ON } from '@/features/context-menu/contextMenuClasses';
import { SprintPlannerPresenceAvatars } from '@/features/sprint/components/SprintPlanner/components/SprintPlannerPresenceAvatars';
import { shiftQuarter } from '@/lib/quarterlyPlans/quarterWeeks';

import { QuarterlyPlanDetailSwitch } from './QuarterlyPlanDetailSwitch';

const PILL_CLASS = 'h-8 min-h-0 shrink-0 gap-1.5 whitespace-nowrap !rounded-lg !px-2.5 !py-0 text-sm shadow-none';
/** Сигнал плана (расхождения, пересечения): меньше остальных контролов, один размер у всех. */
const SIGNAL_CLASS = `${PILL_CLASS} !text-xs !font-medium`;

interface QuarterlyPlanHeaderProps {
  /** Уровень детализации доски (QZ1). */
  detail: QuarterDetailLevel;
  /** История версий плана (QH3): кнопка открывает сайдбар с версиями. */
  history: { open: boolean; onToggle: () => void };
  /**
   * Проблемные назначения: всего и по причинам — отсутствие, порядок работ, исполнитель не в команде,
   * второй эпик в те же недели. Одно назначение может попасть в несколько причин.
   */
  issueCounts: { away: number; blocked: number; notInTeam: number; parallel: number; total: number };
  /** Кто сейчас на доске квартала (QS7): аватары показываются, когда на ней не один человек. */
  presenceViewers: readonly SprintPresenceViewer[];
  quarterRef: QuarterRef;
  /** Расхождения плана и спринта (QK8): кнопка открывает синхронизацию, если они есть (QK9). */
  sprintSync: { count: number; onOpen: () => void };
  onDetailChange: (level: QuarterDetailLevel) => void;
  /** Перейти к следующему назначению с пересечением. */
  onNextIssue: () => void;
  onQuarterChange: (ref: QuarterRef) => void;
  onToday: () => void;
}

/**
 * Шапка квартального плана — как панель контролов доски спринта: слева — что открыто (квартал) и его
 * сигналы (расхождения со спринтом, пересечения — только когда есть), справа — кто на доске, вид
 * (детализация) и история версий. Инструменты правки — на острове поверх доски (`QuarterlyPlanToolbar`).
 * Счётчик пересечений — кнопка: ведёт к следующей проблемной полосе; в подсказке — разбивка по причинам.
 */
export function QuarterlyPlanHeader({
  detail,
  history,
  issueCounts,
  presenceViewers,
  quarterRef,
  sprintSync,
  onDetailChange,
  onNextIssue,
  onQuarterChange,
  onToday,
}: QuarterlyPlanHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="relative z-10 flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-2">
        <HeaderIconButton
          title={t('quarterlyPlan.previousQuarter')}
          onClick={() => onQuarterChange(shiftQuarter(quarterRef, -1))}
        >
          <Icon className="h-4 w-4" name="chevron-left" />
        </HeaderIconButton>
        <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {t('quarterlyPlan.quarterLabel', { quarter: quarterRef.quarter, year: quarterRef.year })}
        </span>
        <HeaderIconButton
          title={t('quarterlyPlan.nextQuarter')}
          onClick={() => onQuarterChange(shiftQuarter(quarterRef, 1))}
        >
          <Icon className="h-4 w-4" name="chevron-right" />
        </HeaderIconButton>
        <Button className={`${PILL_CLASS} ${FLOATING_TOOLBAR_ITEM_IDLE}`} variant="ghost" onClick={onToday}>
          {t('quarterlyPlan.today')}
        </Button>
        {sprintSync.count > 0 ? (
          <Button
            className={`${SIGNAL_CLASS} ml-2 ${FLOATING_TOOLBAR_ITEM_IDLE}`}
            title={t('quarterlyPlan.sync.title')}
            variant="ghost"
            onClick={sprintSync.onOpen}
          >
            <Icon className="h-3.5 w-3.5" name="refresh" />
            {t('quarterlyPlan.sync.open', { count: sprintSync.count })}
          </Button>
        ) : null}
        {issueCounts.total > 0 ? (
          <TextTooltip
            content={
              <div className="flex flex-col gap-1">
                <span>{t('quarterlyPlan.issuesAway', { count: issueCounts.away })}</span>
                <span>{t('quarterlyPlan.issuesParallel', { count: issueCounts.parallel })}</span>
                <span>{t('quarterlyPlan.issuesBlocked', { count: issueCounts.blocked })}</span>
                {issueCounts.notInTeam > 0 ? (
                  <span>{t('quarterlyPlan.issuesNotInTeam', { count: issueCounts.notInTeam })}</span>
                ) : null}
                <span className="opacity-70">{t('quarterlyPlan.issuesNext')}</span>
              </div>
            }
            side="bottom"
          >
            <Button
              className={`${SIGNAL_CLASS} !text-amber-700 hover:!bg-amber-500/10 active:!bg-amber-500/20 dark:!text-amber-300 dark:hover:!bg-amber-400/15 dark:active:!bg-amber-400/25`}
              variant="ghost"
              onClick={onNextIssue}
            >
              <Icon className="h-3.5 w-3.5" name="alert-triangle" />
              {t('quarterlyPlan.issues', { count: issueCounts.total })}
            </Button>
          </TextTooltip>
        ) : null}
      </div>
      <div className="flex min-h-8 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
        <SprintPlannerPresenceAvatars viewers={presenceViewers} />
        <QuarterlyPlanDetailSwitch value={detail} onChange={onDetailChange} />
        <Button
          aria-label={t('quarterlyPlan.history.open')}
          aria-pressed={history.open}
          className={`!h-8 !w-8 !min-w-0 shrink-0 !justify-center !px-0 ${history.open ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE}`}
          title={t('quarterlyPlan.history.open')}
          variant="ghost"
          onClick={history.onToggle}
        >
          <Icon className="h-4 w-4" name="clock" />
        </Button>
      </div>
    </div>
  );
}
