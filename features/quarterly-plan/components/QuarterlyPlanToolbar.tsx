'use client';

import type { QuarterDetailLevel } from '../quarterlyPlanDetail';
import type { AgentSessionStatus } from '@/lib/agentSessions/agentSession';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
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
import { SwimlanePlacementToolbarAgentButton } from '@/features/sprint/components/SprintPlanner/components/SwimlanePlacementToolbarAgentButton';
import { SwimlanePlacementToolbarNoteColors } from '@/features/sprint/components/SprintPlanner/components/SwimlanePlacementToolbarNoteColors';
import { SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { shiftQuarter } from '@/lib/quarterlyPlans/quarterWeeks';

import { QuarterlyPlanDetailSwitch } from './QuarterlyPlanDetailSwitch';
import { QuarterlyPlanLayersButton } from './QuarterlyPlanLayersButton';

const PILL_CLASS = 'h-8 min-h-0 shrink-0 gap-1.5 whitespace-nowrap !rounded-lg !px-2.5 !py-0 text-sm shadow-none';
const DIVIDER_CLASS = 'mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15';
/** Квадратная кнопка-иконка тулбара — слои, история; как кнопка слоёв на доске спринта. */
const ICON_BUTTON_CLASS = '!h-8 !w-8 !min-h-0 !min-w-0 !gap-0 !rounded-lg !px-0 !py-0 shadow-none';
/** Сигнал плана (расхождения, пересечения): меньше инструментов, один размер у всех. */
const SIGNAL_CLASS = `${PILL_CLASS} !text-xs !font-medium`;

interface QuarterlyPlanToolbarProps {
  /** Кнопка агента (та же, что на доске спринта); null — агента нет (не подключён MCP) и сессий по кварталу тоже. */
  agent: {
    brand: McpOAuthClientBrand | null;
    open: boolean;
    openComments: number;
    status?: AgentSessionStatus;
    onToggle: () => void;
  } | null;
  /** Уровень детализации доски (QZ1). */
  detail: QuarterDetailLevel;
  hideDone: boolean;
  /** История версий плана (QH3): кнопка открывает сайдбар с версиями. */
  history: { open: boolean; onToggle: () => void };
  /**
   * Проблемные назначения: всего и по причинам — отсутствие, порядок работ, исполнитель не в команде,
   * второй эпик в те же недели. Одно назначение может попасть в несколько причин.
   */
  issueCounts: { away: number; blocked: number; notInTeam: number; parallel: number; total: number };
  /** Включён инструмент «Связь»: клики по полосам ставят зависимость. */
  linkTool: boolean;
  /** Цвет листа, которым инструмент «Заметка» поставит следующую заметку. */
  noteColor: StickyNoteColor;
  /** Слой «Заметки»: показаны ли листы заметок на доске. */
  notesVisible: boolean;
  /** Включён инструмент «Заметка»: следующий клик по неделе ставит заметку. */
  noteTool: boolean;
  quarterRef: QuarterRef;
  /** Расхождения плана и спринта (QK8): кнопка открывает синхронизацию, если они есть (QK9). */
  sprintSync: { count: number; onOpen: () => void };
  onDetailChange: (level: QuarterDetailLevel) => void;
  onHideDoneChange: (hideDone: boolean) => void;
  /** Перейти к следующему назначению с пересечением. */
  onLinkToolChange: (active: boolean) => void;
  onNextIssue: () => void;
  onNoteColorChange: (color: StickyNoteColor) => void;
  onNotesVisibleChange: (visible: boolean) => void;
  onNoteToolChange: (active: boolean) => void;
  onQuarterChange: (ref: QuarterRef) => void;
  onToday: () => void;
}

/**
 * Остров поверх доски, как тулбар размещения на доске спринта. Группы через разделители: квартал | инструменты
 * (связь, заметка) | вид (слои, история) | сигналы (расхождения, пересечения — только когда есть) | агент. Сам остров кликабелен, полоса вокруг него пропускает клики к доске.
 * Счётчик — кнопка: ведёт к следующей проблемной полосе; в подсказке — разбивка по причинам.
 */
export function QuarterlyPlanToolbar({
  agent,
  detail,
  hideDone,
  history,
  sprintSync,
  issueCounts,
  linkTool,
  noteColor,
  noteTool,
  notesVisible,
  quarterRef,
  onDetailChange,
  onHideDoneChange,
  onLinkToolChange,
  onNextIssue,
  onNoteColorChange,
  onNoteToolChange,
  onNotesVisibleChange,
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
        {/* Инструменты правят план — на роадмэпе, виде только для просмотра, их нет (QZ3). */}
        {detail === 'roadmap' ? null : (
          <>
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
            <span aria-hidden className={DIVIDER_CLASS} />
          </>
        )}
        {/* Вид доски: детализация, что показывать и какую версию плана. */}
        <QuarterlyPlanDetailSwitch value={detail} onChange={onDetailChange} />
        <QuarterlyPlanLayersButton
          hideDone={hideDone}
          notesVisible={notesVisible}
          onHideDoneChange={onHideDoneChange}
          onNotesVisibleChange={onNotesVisibleChange}
        />
        <Button
          aria-label={t('quarterlyPlan.history.open')}
          aria-pressed={history.open}
          className={`${ICON_BUTTON_CLASS} ${history.open ? FLOATING_TOOLBAR_ITEM_ON : FLOATING_TOOLBAR_ITEM_IDLE}`}
          title={t('quarterlyPlan.history.open')}
          variant="ghost"
          onClick={history.onToggle}
        >
          <Icon className="h-4 w-4" name="clock" />
        </Button>
        {/* Сигналы плана — только когда есть что показать: расхождения со спринтом и пересечения. */}
        {sprintSync.count > 0 || issueCounts.total > 0 ? <span aria-hidden className={DIVIDER_CLASS} /> : null}
        {sprintSync.count > 0 ? (
          <Button
            className={`${SIGNAL_CLASS} ${FLOATING_TOOLBAR_ITEM_IDLE}`}
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
            side="top"
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
        {agent ? (
          <SwimlanePlacementToolbarAgentButton
            brand={agent.brand}
            open={agent.open}
            openComments={agent.openComments}
            status={agent.status}
            onClick={agent.onToggle}
          />
        ) : null}
      </div>
    </div>
  );
}
