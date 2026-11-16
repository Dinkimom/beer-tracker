'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { QuarterlyPlanDirection, QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone, trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterRowNotes } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_ROW_HEIGHT_PX,
  QUARTER_ROW_PADDING_PX,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanDirectionEpics } from './QuarterlyPlanDirectionEpics';
import { QuarterlyPlanDirectionHeader } from './QuarterlyPlanDirectionHeader';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanRowBars } from './QuarterlyPlanRowBars';

interface QuarterlyPlanDirectionSectionProps {
  collapsed: boolean;
  direction: QuarterlyPlanDirection;
  /** Эпики направления (без задач) после фильтров. */
  epics: QuarterlyPlanEpic[];
  onToggle: () => void;
}

/**
 * Направление (веха): сворачиваемый заголовок, под ним эпики. В своей строке — полосы самого
 * направления (QG2): проработка фичи, пока она не разбита на эпики. Свёрнутое показывает общий срок.
 */
export function QuarterlyPlanDirectionSection({
  collapsed,
  direction,
  epics,
  onToggle,
}: QuarterlyPlanDirectionSectionProps) {
  const { t } = useI18n();
  const { assignmentsByDirection, assignmentsByEpicTree, onCellClick, trackerEpics, weeks } =
    useQuarterlyPlanBoard();
  const ownAssignments = assignmentsByDirection.get(direction.id) ?? [];
  /** Свои полосы видны, пока направление раскрыто; свёрнутое сводит их в общий срок. */
  const shownAssignments = collapsed ? [] : ownAssignments;
  const own = layoutRowBars(shownAssignments);
  const assignWeek = collapsed
    ? undefined
    : (week: number, anchor: QuarterMenuAnchor) => onCellClick({ id: direction.id, kind: 'direction' }, week, anchor);
  // Заметки направления занимают его дорожку — сводная полоса тогда уходит к нижнему краю строки.
  const hasNotes = useQuarterRowNotes({ id: direction.id, kind: 'direction' }).notes.length > 0;

  /** Свёрнутое направление показывает общий срок своих полос, эпиков и их задач одной тонкой полосой (QB5, QT3). */
  const spans = collapsed
    ? [...ownAssignments, ...epics.flatMap((epic) => assignmentsByEpicTree.get(epic.id) ?? [])]
    : [];
  const rollupStart = Math.min(...spans.map((span) => span.startWeek));
  /** Эпики без единой полосы; готовые не в счёт — планировать их уже незачем. */
  const unplannedCount = epics.filter(
    (epic) => !isEpicDone(epic, trackerEpics) && !assignmentsByEpicTree.get(epic.id)?.length
  ).length;
  const rollupEnd = Math.max(...spans.map((span) => span.startWeek + span.weeks));


  return (
    <>
      <QuarterlyPlanRow
        heightPx={Math.max(QUARTER_ROW_HEIGHT_PX, quarterRowHeightPx(own.laneCount))}
        left={
          <QuarterlyPlanDirectionHeader
            collapsed={collapsed}
            direction={direction}
            unplannedCount={unplannedCount}
            onToggle={onToggle}
          />
        }
        noteBlockers={own.noteBlockers}
        noteRow={{ id: direction.id, kind: 'direction' }}
        notesTopPx={QUARTER_ROW_PADDING_PX}
        occupiedWeeks={own.occupiedWeeks}
        sortRow={{ id: direction.id, level: 'direction', parentId: direction.teamId }}
        tone="direction"
        weekActionLabel={t('quarterlyPlan.assignWeek', { title: direction.title })}
        onWeekClick={assignWeek}
      >
        <QuarterlyPlanRowBars
          assignments={shownAssignments}
          laneById={own.laneById}
          statusKey={trackerEpicOf(direction, trackerEpics)?.statusColorKey}
        />
        {spans.length > 0 ? (
          <div
            aria-hidden
            className={`absolute h-1.5 rounded-full bg-gray-300 dark:bg-gray-500 ${hasNotes ? 'bottom-px !h-1' : 'top-1/2 -translate-y-1/2'}`}
            style={{
              left: `calc(${(rollupStart / weeks.length) * 100}% + 2px)`,
              width: `calc(${((rollupEnd - rollupStart) / weeks.length) * 100}% - 4px)`,
            }}
          />
        ) : null}
      </QuarterlyPlanRow>
      <QuarterlyPlanDirectionEpics collapsed={collapsed} directionId={direction.id} epics={epics} />
    </>
  );
}
