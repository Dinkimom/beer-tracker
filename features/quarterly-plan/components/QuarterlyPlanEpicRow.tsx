'use client';

import type { QuarterlyPlanEpicTasks } from './QuarterlyPlanEpicHeader';
import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone, trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_ROW_INDENT_CLASS,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STATUS_PALETTE_KEY,
  QUARTER_STICKY_LABEL_LEFT,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanEpicHeader } from './QuarterlyPlanEpicHeader';
import { QuarterlyPlanEpicStatus } from './QuarterlyPlanEpicStatus';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanRowBars } from './QuarterlyPlanRowBars';
import { QuarterlyPlanSprintCardGhost } from './QuarterlyPlanSprintCardGhost';

interface QuarterlyPlanEpicRowProps {
  /** Эпик или его задача (`parentEpicId`): та же строка уровнем ниже (QT1). */
  epic: QuarterlyPlanEpic;
  /** Задачи эпика; у задачи не задаётся. */
  tasks?: QuarterlyPlanEpicTasks;
}

/**
 * Эпик направления или задача эпика: клик по свободной неделе назначает человека, параллельная работа —
 * дорожками в одной строке (второго человека на занятые недели добавляют из меню полосы).
 */
export function QuarterlyPlanEpicRow({ epic, tasks }: QuarterlyPlanEpicRowProps) {
  const { t } = useI18n();
  const { assignmentsByEpic, assignmentsByEpicTree, draft, onCellClick, onDraftSubmit, sprintCards, trackerEpics } =
    useQuarterlyPlanBoard();
  const level = epic.parentEpicId === undefined ? 'epic' : 'task';
  const assignments = assignmentsByEpic.get(epic.id) ?? [];
  const { laneById, laneCount, noteBlockers, occupiedWeeks } = layoutRowBars(assignments);
  const renaming = draft?.kind === 'renameEpic' && draft.id === epic.id;
  const done = isEpicDone(epic, trackerEpics);
  /** Эпик запланирован и полосами своих задач (QT3); готовый планировать уже незачем. */
  const unplanned = !done && !assignmentsByEpicTree.get(epic.id)?.length;
  return (
    <QuarterlyPlanRow
      heightPx={quarterRowHeightPx(laneCount)}
      left={
        <div className={`relative flex min-w-0 flex-1 items-center gap-2 pr-2 ${QUARTER_ROW_INDENT_CLASS[level]}`}>
          {renaming ? (
            <QuarterlyPlanInlineInput
              initialValue={epic.title}
              placeholder={t(`quarterlyPlan.${level === 'task' ? 'addTaskPlaceholder' : 'addEpicPlaceholder'}`)}
              onSubmit={onDraftSubmit}
            />
          ) : (
            <QuarterlyPlanEpicHeader epic={epic} level={level} tasks={tasks} />
          )}
          <QuarterlyPlanEpicStatus epic={epic} />
        </div>
      }
      noteBlockers={noteBlockers}
      noteRow={{ id: epic.id, kind: 'epic' }}
      notesTopPx={QUARTER_ROW_PADDING_PX}
      occupiedWeeks={occupiedWeeks}
      sortRow={{ id: epic.id, level, parentId: epic.parentEpicId ?? epic.directionId }}
      weekActionLabel={t('quarterlyPlan.assignWeek', { title: epic.title })}
      onWeekClick={(week, anchor) => onCellClick({ id: epic.id, kind: 'epic' }, week, anchor)}
    >
      {/* Строка без единой полосы: пометка в начале таймлайна, клики по неделям проходят сквозь неё. */}
      {unplanned ? (
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <span
            className="sticky ml-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-xs text-ds-text-muted dark:border-gray-600"
            style={{ left: QUARTER_STICKY_LABEL_LEFT }}
          >
            {t('quarterlyPlan.unplanned')}
          </span>
        </div>
      ) : null}
      <QuarterlyPlanSprintCardGhost assignments={assignments} card={sprintCards[epic.issueKey ?? '']} />
      <QuarterlyPlanRowBars
        assignments={assignments}
        dayStep={level === 'task'}
        faded={done}
        laneById={laneById}
        statusKey={trackerEpicOf(epic, trackerEpics)?.statusColorKey ?? QUARTER_STATUS_PALETTE_KEY[epic.status]}
      />
    </QuarterlyPlanRow>
  );
}
