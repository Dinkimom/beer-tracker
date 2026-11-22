'use client';

import type { QuarterlyPlanEpicTasks } from './QuarterlyPlanEpicHeader';
import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone, trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterPlanView } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_LANE_HEIGHT_BY_LEVEL,
  QUARTER_ROW_INDENT_CLASS,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STATUS_PALETTE_KEY,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';
import { rollupNoteBlockers, rollupPhases } from '../quarterlyPlanDetail';

import { QuarterlyPlanEpicHeader } from './QuarterlyPlanEpicHeader';
import { QuarterlyPlanEpicStatus } from './QuarterlyPlanEpicStatus';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanRollupBars } from './QuarterlyPlanRollupBars';
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
export const QuarterlyPlanEpicRow = observer(function QuarterlyPlanEpicRow({ epic, tasks }: QuarterlyPlanEpicRowProps) {
  const { t } = useI18n();
  const { detail, menu, onDraftSubmit, rows } = useQuarterlyPlanBoard();
  const { assignmentsByEpic, assignmentsByEpicTree, sprintCards, trackerEpics } = useQuarterPlanView();
  const { openAssign: onCellClick } = menu;
  const { draft } = rows;

  const level = epic.parentEpicId === undefined ? 'epic' : 'task';
  const assignments = assignmentsByEpic.get(epic.id) ?? [];
  const bars = layoutRowBars(assignments);
  // Уровень «Квартал» (QZ3): вместо полос людей — общий срок фаз эпика вместе с его задачами; строка только для просмотра.
  const rollup = detail === 'quarter' ? rollupPhases(assignmentsByEpicTree.get(epic.id) ?? []) : null;
  const { laneById, occupiedDays } = bars;
  const laneCount = rollup?.laneCount ?? bars.laneCount;
  const noteBlockers = rollup ? rollupNoteBlockers(rollup.rollups) : bars.noteBlockers;
  const statusKey = trackerEpicOf(epic, trackerEpics)?.statusColorKey ?? QUARTER_STATUS_PALETTE_KEY[epic.status];
  const renaming = draft?.kind === 'renameEpic' && draft.id === epic.id;
  const done = isEpicDone(epic, trackerEpics);
  /** Эпик запланирован и полосами своих задач (QT3); готовый планировать уже незачем. */
  const unplanned = !done && !assignmentsByEpicTree.get(epic.id)?.length;
  return (
    <QuarterlyPlanRow
      heightPx={quarterRowHeightPx(laneCount, QUARTER_LANE_HEIGHT_BY_LEVEL[level])}
      laneHeightPx={QUARTER_LANE_HEIGHT_BY_LEVEL[level]}
      left={
        <div className={`relative flex min-w-0 flex-1 items-center gap-2 pr-2 ${QUARTER_ROW_INDENT_CLASS[level]}`}>
          {renaming ? (
            <QuarterlyPlanInlineInput
              initialValue={epic.title}
              placeholder={t(`quarterlyPlan.${level === 'task' ? 'addTaskPlaceholder' : 'addEpicPlaceholder'}`)}
              onSubmit={onDraftSubmit}
            />
          ) : (
            <QuarterlyPlanEpicHeader epic={epic} level={level} tasks={tasks} unplanned={unplanned} />
          )}
          <QuarterlyPlanEpicStatus epic={epic} />
        </div>
      }
      noteBlockers={noteBlockers}
      noteRow={{ id: epic.id, kind: 'epic' }}
      notesTopPx={QUARTER_ROW_PADDING_PX}
      occupiedDays={occupiedDays}
      sortRow={{ id: epic.id, level, parentId: epic.parentEpicId ?? epic.directionId }}
      weekActionLabel={t('quarterlyPlan.assignWeek', { title: epic.title })}
      onWeekClick={rollup ? undefined : (week, anchor, span) => onCellClick({ id: epic.id, kind: 'epic' }, week, anchor, span)}
    >
      {rollup ? (
        <QuarterlyPlanRollupBars faded={done} rollups={rollup.rollups} rowId={epic.id} statusKey={statusKey} />
      ) : (
        <>
          <QuarterlyPlanSprintCardGhost assignments={assignments} card={sprintCards[epic.issueKey ?? '']} epicId={epic.id} />
          <QuarterlyPlanRowBars assignments={assignments} faded={done} laneById={laneById} level={level} statusKey={statusKey} />
        </>
      )}
    </QuarterlyPlanRow>
  );
});
