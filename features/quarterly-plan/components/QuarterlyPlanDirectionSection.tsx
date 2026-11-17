'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { DaySpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterlyPlanDirection, QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone, trackerEpicOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterRowNotes } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_LANE_HEIGHT_BY_LEVEL,
  QUARTER_ROW_PADDING_PX,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';
import { rollupNoteBlockers, rollupPhases } from '../quarterlyPlanDetail';

import { QuarterlyPlanDirectionEpics } from './QuarterlyPlanDirectionEpics';
import { QuarterlyPlanDirectionHeader } from './QuarterlyPlanDirectionHeader';
import { QuarterlyPlanRollupBars } from './QuarterlyPlanRollupBars';
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
  const { assignmentsByDirection, assignmentsByEpicTree, detail, goalsByRow, onCellClick, trackerEpics, weeks } =
    useQuarterlyPlanBoard();
  const ownAssignments = assignmentsByDirection.get(direction.id) ?? [];
  /** Свои полосы видны, пока направление раскрыто; свёрнутое сводит их в общий срок. */
  const shownAssignments = collapsed ? [] : ownAssignments;
  const bars = layoutRowBars(shownAssignments);
  // Роадмэп (QZ3): свои полосы направления — общим сроком фаз, без людей; строка только для просмотра.
  const rollup = detail === 'roadmap' ? rollupPhases(shownAssignments) : null;
  const own = rollup ? { ...bars, laneCount: rollup.laneCount, noteBlockers: rollupNoteBlockers(rollup.rollups) } : bars;
  const statusKey = trackerEpicOf(direction, trackerEpics)?.statusColorKey;
  const assignWeek = collapsed || rollup
    ? undefined
    : (week: number, anchor: QuarterMenuAnchor, span: DaySpan) =>
        onCellClick({ id: direction.id, kind: 'direction' }, week, anchor, span);
  // Заметки направления занимают его дорожку — сводная полоса тогда уходит к нижнему краю строки.
  // Так же с целями спринтов (QG8): пилюля цели стоит в той же дорожке.
  const hasNotes =
    useQuarterRowNotes({ id: direction.id, kind: 'direction' }).notes.length > 0 || (goalsByRow.get(direction.id)?.length ?? 0) > 0;

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
        heightPx={quarterRowHeightPx(own.laneCount, QUARTER_LANE_HEIGHT_BY_LEVEL.direction)}
        laneHeightPx={QUARTER_LANE_HEIGHT_BY_LEVEL.direction}
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
        occupiedDays={own.occupiedDays}
        sortRow={{ id: direction.id, level: 'direction', parentId: direction.teamId }}
        tone="direction"
        weekActionLabel={t('quarterlyPlan.assignWeek', { title: direction.title })}
        onWeekClick={assignWeek}
      >
        {rollup ? (
          <QuarterlyPlanRollupBars rollups={rollup.rollups} statusKey={statusKey} />
        ) : (
          <QuarterlyPlanRowBars assignments={shownAssignments} laneById={own.laneById} level="direction" statusKey={statusKey} />
        )}
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
