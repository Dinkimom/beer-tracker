'use client';

import type { QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { QuarterlyPlanDirection, QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard, useQuarterRowNotes } from '../QuarterlyPlanBoardContext';
import {
  layoutRowBars,
  QUARTER_ROW_HEIGHT_PX,
  QUARTER_ROW_PADDING_PX,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanDirectionHeader } from './QuarterlyPlanDirectionHeader';
import { QuarterlyPlanEpicRow } from './QuarterlyPlanEpicRow';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';
import { QuarterlyPlanRowBars } from './QuarterlyPlanRowBars';

interface QuarterlyPlanDirectionSectionProps {
  collapsed: boolean;
  direction: QuarterlyPlanDirection;
  /** Эпики направления после фильтров. */
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
  const { assignmentsByDirection, assignmentsByEpic, draft, onCellClick, onDraftSubmit, trackerEpics, weeks } =
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

  /** Свёрнутое направление показывает общий срок своих полос и эпиков одной тонкой полосой (QB5). */
  const spans = collapsed
    ? [...ownAssignments, ...epics.flatMap((epic) => assignmentsByEpic.get(epic.id) ?? [])]
    : [];
  const rollupStart = Math.min(...spans.map((span) => span.startWeek));
  /** Эпики без единой полосы; готовые не в счёт — планировать их уже незачем. */
  const unplannedCount = epics.filter(
    (epic) => !isEpicDone(epic, trackerEpics) && !assignmentsByEpic.get(epic.id)?.length
  ).length;
  const rollupEnd = Math.max(...spans.map((span) => span.startWeek + span.weeks));

  const addingEpic = draft?.kind === 'newEpic' && draft.directionId === direction.id;

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
        tone="direction"
        weekActionLabel={t('quarterlyPlan.assignWeek', { title: direction.title })}
        onWeekClick={assignWeek}
      >
        <QuarterlyPlanRowBars assignments={shownAssignments} laneById={own.laneById} />
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
      {collapsed
        ? null
        : epics.map((epic) => <QuarterlyPlanEpicRow key={epic.id} epic={epic} />)}
      {addingEpic ? (
        <QuarterlyPlanRow
          heightPx={QUARTER_ROW_HEIGHT_PX}
          left={
            <div className="flex min-w-0 flex-1 pl-9 pr-2">
              <QuarterlyPlanInlineInput
                placeholder={t('quarterlyPlan.addEpicPlaceholder')}
                onSubmit={onDraftSubmit}
              />
            </div>
          }
        />
      ) : null}
    </>
  );
}
