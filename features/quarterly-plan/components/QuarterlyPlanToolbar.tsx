'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { StickyNoteToolIcon } from '@/features/comments/components/StickyNoteToolIcon';
import {
  FLOATING_MENU_SHELL,
  FLOATING_TOOLBAR_GLASS,
  FLOATING_TOOLBAR_ITEM_IDLE,
  FLOATING_TOOLBAR_ITEM_ON,
} from '@/features/context-menu/contextMenuClasses';
import { SwimlanePlacementToolbarNoteColors } from '@/features/sprint/components/SprintPlanner/components/SwimlanePlacementToolbarNoteColors';
import { SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { shiftQuarter } from '@/lib/quarterlyPlans/quarterWeeks';

const PILL_CLASS = 'h-8 min-h-0 shrink-0 gap-1.5 whitespace-nowrap !rounded-lg !px-2.5 !py-0 text-sm shadow-none';
const DIVIDER_CLASS = 'mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15';

interface QuarterlyPlanToolbarProps {
  /** Назначения, которые пересекаются с отсутствием человека. */
  awayCount: number;
  /** Назначения, которые начинаются раньше, чем закончится то, чего они ждут. */
  blockedCount: number;
  hideDone: boolean;
  /** Назначения, которые пересекаются с отсутствием или с другим эпиком человека. */
  issueCount: number;
  /** Включён инструмент «Связь»: клики по полосам ставят зависимость. */
  linkTool: boolean;
  /** Цвет листа, которым инструмент «Заметка» поставит следующую заметку. */
  noteColor: StickyNoteColor;
  /** Включён инструмент «Заметка»: следующий клик по неделе ставит заметку. */
  noteTool: boolean;
  /** Назначения, у которых в те же недели стоит другой эпик человека. */
  parallelCount: number;
  quarterRef: QuarterRef;
  onHideDoneChange: (hideDone: boolean) => void;
  /** Перейти к следующему назначению с пересечением. */
  onLinkToolChange: (active: boolean) => void;
  onNextIssue: () => void;
  onNoteColorChange: (color: StickyNoteColor) => void;
  onNoteToolChange: (active: boolean) => void;
  onQuarterChange: (ref: QuarterRef) => void;
  onToday: () => void;
}

/**
 * Остров поверх доски, как тулбар размещения на доске спринта: квартал, фильтр готовых
 * и счётчик пересечений. Сам остров кликабелен, полоса вокруг него пропускает клики к доске.
 * Счётчик — кнопка: ведёт к следующей проблемной полосе; в подсказке — разбивка по причинам.
 */
export function QuarterlyPlanToolbar({
  awayCount,
  blockedCount,
  hideDone,
  issueCount,
  linkTool,
  noteColor,
  noteTool,
  parallelCount,
  quarterRef,
  onHideDoneChange,
  onLinkToolChange,
  onNextIssue,
  onNoteColorChange,
  onNoteToolChange,
  onQuarterChange,
  onToday,
}: QuarterlyPlanToolbarProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const [colorsOpen, setColorsOpen] = useState(false);
  const pill = (active: boolean) =>
    `${PILL_CLASS} ${active ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE}`;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ bottom: SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX, zIndex: ZIndex.floatingControls }}
    >
      <div
        className={`pointer-events-auto flex items-center gap-1 px-1.5 py-1.5 !rounded-xl ${FLOATING_MENU_SHELL} ${FLOATING_TOOLBAR_GLASS}`}
      >
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
        <Button className={pill(false)} variant="ghost" onClick={onToday}>
          {t('quarterlyPlan.today')}
        </Button>
        <span aria-hidden className={DIVIDER_CLASS} />
        <Button
          aria-pressed={linkTool}
          className={pill(linkTool)}
          variant="ghost"
          onClick={() => onLinkToolChange(!linkTool)}
        >
          <Icon className="h-4 w-4" name="arrow-right" />
          {t('quarterlyPlan.linkTool')}
        </Button>
        {/* Как на доске спринта: первый клик включает инструмент, клик по включённому — выбор цвета листа. */}
        <div className="relative">
          <Button
            aria-expanded={noteTool && colorsOpen}
            aria-pressed={noteTool}
            className={pill(noteTool)}
            variant="ghost"
            onClick={() => {
              setColorsOpen(noteTool ? !colorsOpen : false);
              if (!noteTool) onNoteToolChange(true);
            }}
          >
            <StickyNoteToolIcon className="h-4 w-4" color={noteColor} isDark={isDark} />
            {t('quarterlyPlan.noteTool')}
          </Button>
          {noteTool && colorsOpen ? (
            <SwimlanePlacementToolbarNoteColors
              value={noteColor}
              onChange={(color) => {
                onNoteColorChange(color);
                setColorsOpen(false);
              }}
            />
          ) : null}
        </div>
        <Button
          aria-pressed={hideDone}
          className={pill(hideDone)}
          variant="ghost"
          onClick={() => onHideDoneChange(!hideDone)}
        >
          <Icon className="h-4 w-4" name={hideDone ? 'eye-off' : 'eye'} />
          {t('quarterlyPlan.hideDone')}
        </Button>
        {issueCount > 0 ? (
          <>
            <span aria-hidden className={DIVIDER_CLASS} />
            <TextTooltip
              content={
                <div className="flex flex-col gap-1">
                  <span>{t('quarterlyPlan.issuesAway', { count: awayCount })}</span>
                  <span>{t('quarterlyPlan.issuesParallel', { count: parallelCount })}</span>
                  <span>{t('quarterlyPlan.issuesBlocked', { count: blockedCount })}</span>
                  <span className="opacity-70">{t('quarterlyPlan.issuesNext')}</span>
                </div>
              }
              side="top"
            >
              <Button
                className={`${PILL_CLASS} !text-xs !font-medium !text-amber-700 hover:!bg-amber-500/10 active:!bg-amber-500/20 dark:!text-amber-300 dark:hover:!bg-amber-400/15 dark:active:!bg-amber-400/25`}
                variant="ghost"
                onClick={onNextIssue}
              >
                <Icon className="h-3.5 w-3.5" name="alert-triangle" />
                {t('quarterlyPlan.issues', { count: issueCount })}
              </Button>
            </TextTooltip>
          </>
        ) : null}
      </div>
    </div>
  );
}
