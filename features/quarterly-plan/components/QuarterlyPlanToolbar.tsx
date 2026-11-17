'use client';

import type { AgentSessionStatus } from '@/lib/agentSessions/agentSession';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
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
import { SwimlanePlacementToolbarCursorIcon } from '@/features/sprint/components/SprintPlanner/components/SwimlanePlacementToolbarCursorIcon';
import { SwimlanePlacementToolbarNoteColors } from '@/features/sprint/components/SprintPlanner/components/SwimlanePlacementToolbarNoteColors';
import { SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';

import { QuarterlyPlanLayersButton } from './QuarterlyPlanLayersButton';

const PILL_CLASS = 'h-8 min-h-0 shrink-0 gap-1.5 whitespace-nowrap !rounded-lg !px-2.5 !py-0 text-sm shadow-none';
const DIVIDER_CLASS = 'mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15';

interface QuarterlyPlanToolbarProps {
  /** Кнопка агента (та же, что на доске спринта); null — агента нет (не подключён MCP) и сессий по кварталу тоже. */
  agent: {
    brand: McpOAuthClientBrand | null;
    open: boolean;
    openComments: number;
    status?: AgentSessionStatus;
    onToggle: () => void;
  } | null;
  hideDone: boolean;
  /** Включён инструмент «Связь»: клики по полосам ставят зависимость. */
  linkTool: boolean;
  /** Цвет листа, которым инструмент «Заметка» поставит следующую заметку. */
  noteColor: StickyNoteColor;
  /** Слой «Заметки»: показаны ли листы заметок на доске. */
  notesVisible: boolean;
  /** Включён инструмент «Заметка»: следующий клик по неделе ставит заметку. */
  noteTool: boolean;
  onHideDoneChange: (hideDone: boolean) => void;
  onLinkToolChange: (active: boolean) => void;
  onNoteColorChange: (color: StickyNoteColor) => void;
  onNotesVisibleChange: (visible: boolean) => void;
  onNoteToolChange: (active: boolean) => void;
}

/**
 * Остров поверх доски, как тулбар размещения на доске спринта: инструменты правки (курсор, связь, заметка) |
 * слои | агент. Квартал, вид, история, сигналы плана и присутствие — в шапке (`QuarterlyPlanHeader`).
 * Сам остров кликабелен, полоса вокруг него пропускает клики к доске.
 */
export function QuarterlyPlanToolbar({
  agent,
  hideDone,
  linkTool,
  noteColor,
  noteTool,
  notesVisible,
  onHideDoneChange,
  onLinkToolChange,
  onNoteColorChange,
  onNoteToolChange,
  onNotesVisibleChange,
}: QuarterlyPlanToolbarProps) {
  const { t } = useI18n();
  const isDark = useDocumentDarkClass();
  const [colorsOpen, setColorsOpen] = useState(false);
  const cursorActive = !linkTool && !noteTool;
  const cursorLabel = t('sprintPlanner.swimlane.placementToolbar.cursor');
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
        {/* Курсор — режим без инструмента, как на доске спринта: клик выключает «Связь» и «Заметку». */}
        <Button
          aria-label={cursorLabel}
          aria-pressed={cursorActive}
          className={`${pill(cursorActive)} !w-8 !gap-0 !px-0`}
          title={cursorLabel}
          variant="ghost"
          onClick={() => {
            onLinkToolChange(false);
            onNoteToolChange(false);
          }}
        >
          <SwimlanePlacementToolbarCursorIcon filled={cursorActive} />
        </Button>
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
        {/* Слои: что показывать на доске. */}
        <QuarterlyPlanLayersButton
          hideDone={hideDone}
          notesVisible={notesVisible}
          onHideDoneChange={onHideDoneChange}
          onNotesVisibleChange={onNotesVisibleChange}
        />
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
