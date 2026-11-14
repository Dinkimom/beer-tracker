'use client';

import type { QuarterlyPlanAssignment, QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import { availabilityKindMessageKey } from '@/lib/boardAvailability/availabilityCardKind';
import {
  absentDaysWithinSpan,
  assignBarLanes,
  epicTitle,
  isEpicDone,
  overlappingAssignments,
  trackerEpicOf,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import {
  QUARTER_ROW_ACTION_CLASS,
  QUARTER_ROW_PADDING_PX,
  QUARTER_STATUS_PALETTE_KEY,
  QUARTER_STICKY_LABEL_LEFT_PX,
  quarterRowHeightPx,
} from '../quarterlyPlanBoardModel';

import { QuarterlyPlanBar } from './QuarterlyPlanBar';
import { QuarterlyPlanDraftMark } from './QuarterlyPlanDraftMark';
import { QuarterlyPlanInlineInput } from './QuarterlyPlanInlineInput';
import { QuarterlyPlanIssueKey } from './QuarterlyPlanIssueKey';
import { QuarterlyPlanRow } from './QuarterlyPlanRow';

interface QuarterlyPlanEpicRowProps {
  epic: QuarterlyPlanEpic;
}

/**
 * Эпик направления: клик по свободной неделе назначает человека, параллельная работа — дорожками
 * в одной строке (второго человека на занятые недели добавляют из меню полосы).
 */
export function QuarterlyPlanEpicRow({ epic }: QuarterlyPlanEpicRowProps) {
  const { t } = useI18n();
  const {
    absenceByMember,
    assignmentsByEpic,
    assignmentsByMember,
    draft,
    epicById,
    memberById,
    memberToneById,
    notInTeamAssignmentIds,
    onCellClick,
    onDraftSubmit,
    onRowMenu,
    onStatusClick,
    trackerEpics,
    violatedBlockers,
  } = useQuarterlyPlanBoard();
  const assignments = assignmentsByEpic.get(epic.id) ?? [];
  const { laneById, laneCount } = assignBarLanes(assignments);
  const occupiedWeeks = new Set(
    assignments.flatMap((assignment) =>
      Array.from({ length: assignment.weeks }, (_, offset) => assignment.startWeek + offset)
    )
  );
  const renaming = draft?.kind === 'renameEpic' && draft.id === epic.id;
  /** Готовый эпик уходит на второй план: приглушён и зачёркнут (QE8). */
  const done = isEpicDone(epic, trackerEpics);
  const title = epicTitle(epic, trackerEpics);
  /** У привязанного эпика статус из трекера и вручную не меняется (QE7). */
  const tracked = trackerEpicOf(epic, trackerEpics);
  const titleOf = (epicId: string) => {
    const other = epicById.get(epicId);
    return other ? epicTitle(other, trackerEpics) : '';
  };

  /** Что не так с назначением: человек отсутствует, занят другим эпиком или нарушен порядок работ. */
  const issuesOf = (assignment: QuarterlyPlanAssignment): string[] => {
    const absence = absenceByMember.get(assignment.memberId);
    const absentDays = new Set(absentDaysWithinSpan(assignment, absence?.blockedDays ?? new Set()));
    const away = (absence?.segments ?? [])
      .filter((segment) => segment.dayIndices.some((day) => absentDays.has(day)))
      .map((segment) => `${t(availabilityKindMessageKey(segment.kind))} ${segment.dateRangeLabel}`);
    const parallel = overlappingAssignments(
      assignment,
      assignmentsByMember.get(assignment.memberId) ?? []
    ).map((other) => titleOf(other.epicId));
    const blockers = (violatedBlockers.get(assignment.id) ?? []).map((blocker) =>
      t('quarterlyPlan.issueBlocked', { title: titleOf(blocker.epicId) })
    );
    return [
      ...(notInTeamAssignmentIds.has(assignment.id) ? [t('quarterlyPlan.issueNotInTeam')] : []),
      ...away,
      ...(parallel.length > 0
        ? [t('quarterlyPlan.issueParallel', { titles: [...new Set(parallel)].join(', ') })]
        : []),
      ...blockers,
    ];
  };

  /** Дежурство в сроке назначения — риск, не проблема (QV3): в подсказку, но не в счётчик. */
  const risksOf = (assignment: QuarterlyPlanAssignment): string[] => {
    const absence = absenceByMember.get(assignment.memberId);
    const dutyDays = new Set(absentDaysWithinSpan(assignment, absence?.dutyDays ?? new Set()));
    return (absence?.segments ?? [])
      .filter((segment) => segment.kind === 'duty' && segment.dayIndices.some((day) => dutyDays.has(day)))
      .map((segment) => t('quarterlyPlan.riskDuty', { range: segment.dateRangeLabel }));
  };

  return (
    <QuarterlyPlanRow
      heightPx={quarterRowHeightPx(laneCount)}
      left={
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-9 pr-2">
          {renaming ? (
            <QuarterlyPlanInlineInput
              initialValue={epic.title}
              placeholder={t('quarterlyPlan.addEpicPlaceholder')}
              onSubmit={onDraftSubmit}
            />
          ) : (
            <>
              <OverflowTooltip content={title}>
                <span
                  className={`truncate text-sm ${
                    done ? 'text-ds-text-muted line-through opacity-70' : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {title}
                </span>
              </OverflowTooltip>
              {epic.issueKey ? <QuarterlyPlanIssueKey issueKey={epic.issueKey} /> : null}
              <QuarterlyPlanDraftMark id={epic.id} />
              <span className="flex-1" />
              <HeaderIconButton
                className={QUARTER_ROW_ACTION_CLASS}
                title={t('quarterlyPlan.rowActions')}
                onClick={(event) =>
                  onRowMenu({ id: epic.id, kind: 'epic' }, { x: event.clientX, y: event.clientY })
                }
              >
                <Icon className="h-3.5 w-3.5" name="dots-horizontal" />
              </HeaderIconButton>
            </>
          )}
          {epic.issueKey ? (
            <span className="shrink-0" title={t('quarterlyPlan.statusFromTracker')}>
              <StatusTag
                label={tracked?.statusDisplay || t(`quarterlyPlan.status.${epic.status}`)}
                status={tracked?.statusColorKey ?? QUARTER_STATUS_PALETTE_KEY[epic.status]}
              />
            </span>
          ) : (
            <button
              aria-label={t('quarterlyPlan.changeStatus')}
              className="shrink-0 cursor-pointer rounded-md transition-all duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] active:brightness-90 dark:hover:brightness-125"
              type="button"
              onClick={(event) => onStatusClick(epic.id, { x: event.clientX, y: event.clientY })}
            >
              <StatusTag
                label={t(`quarterlyPlan.status.${epic.status}`)}
                status={QUARTER_STATUS_PALETTE_KEY[epic.status]}
              />
            </button>
          )}
        </div>
      }
      noteBlockers={assignments.map((assignment) => ({
        lane: laneById.get(assignment.id) ?? 0,
        rows: 1,
        startWeek: assignment.startWeek,
        weeks: assignment.weeks,
      }))}
      noteRow={{ id: epic.id, kind: 'epic' }}
      notesTopPx={QUARTER_ROW_PADDING_PX}
      occupiedWeeks={occupiedWeeks}
      weekActionLabel={t('quarterlyPlan.assignWeek', { title: epic.title })}
      onWeekClick={(week, anchor) => onCellClick(epic.id, week, anchor)}
    >
      {/* Эпик без единой полосы: пометка в начале таймлайна, клики по неделям проходят сквозь неё. */}
      {assignments.length === 0 && !done ? (
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <span
            className="sticky ml-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-xs text-ds-text-muted dark:border-gray-600"
            style={{ left: QUARTER_STICKY_LABEL_LEFT_PX }}
          >
            {t('quarterlyPlan.unplanned')}
          </span>
        </div>
      ) : null}
      {assignments.map((assignment) => (
        <QuarterlyPlanBar
          key={assignment.id}
          assignment={assignment}
          faded={done}
          issues={issuesOf(assignment)}
          lane={laneById.get(assignment.id) ?? 0}
          member={memberById.get(assignment.memberId)}
          risks={risksOf(assignment)}
          toneClass={memberToneById.get(assignment.memberId) ?? ''}
        />
      ))}
    </QuarterlyPlanRow>
  );
}
