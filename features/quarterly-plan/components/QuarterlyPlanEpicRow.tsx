'use client';

import type { QuarterlyPlanEpicTasks } from './QuarterlyPlanEpicHeader';
import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone, trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_LANE_HEIGHT_BY_LEVEL,
  QUARTER_ROW_INDENT_CLASS,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STATUS_PALETTE_KEY,
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
  const { laneById, laneCount, noteBlockers, occupiedDays } = layoutRowBars(assignments);
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
      onWeekClick={(week, anchor, span) => onCellClick({ id: epic.id, kind: 'epic' }, week, anchor, span)}
    >
      <QuarterlyPlanSprintCardGhost assignments={assignments} card={sprintCards[epic.issueKey ?? '']} />
      <QuarterlyPlanRowBars
        assignments={assignments}
        faded={done}
        laneById={laneById}
        level={level}
        statusKey={trackerEpicOf(epic, trackerEpics)?.statusColorKey ?? QUARTER_STATUS_PALETTE_KEY[epic.status]}
      />
    </QuarterlyPlanRow>
  );
}
