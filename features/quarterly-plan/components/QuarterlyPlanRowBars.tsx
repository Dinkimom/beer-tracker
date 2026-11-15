'use client';

import type { QuarterlyPlanAssignment } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { availabilityKindMessageKey } from '@/lib/boardAvailability/availabilityCardKind';
import { absentDaysWithinSpan, overloadingAssignments } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';
import { quarterBarToneClass } from '../quarterlyPlanBoardModel';

import { QuarterlyPlanBar } from './QuarterlyPlanBar';

interface QuarterlyPlanRowBarsProps {
  /** Полосы строки — эпика или направления (QG2). */
  assignments: readonly QuarterlyPlanAssignment[];
  /** Строка готова: полосы приглушены (QE8). */
  faded?: boolean;
  laneById: ReadonlyMap<string, number>;
  /** Ключ палитры статуса строки: им красятся её полосы (QA9); нет — как бэклог. */
  statusKey?: string;
}

/** Полосы назначений одной строки с их проблемами (QI1–QI6) и рисками (QV3). */
export function QuarterlyPlanRowBars({ assignments, faded = false, laneById, statusKey }: QuarterlyPlanRowBarsProps) {
  const { t } = useI18n();
  const {
    absenceByMember,
    assignmentsByMember,
    memberById,
    notInTeamAssignmentIds,
    rowTitleOf,
    violatedBlockers,
  } = useQuarterlyPlanBoard();

  /** Что не так с назначением: человек отсутствует, занят другими строками или нарушен порядок работ. */
  const issuesOf = (assignment: QuarterlyPlanAssignment): string[] => {
    const absence = absenceByMember.get(assignment.memberId);
    const absentDays = new Set(absentDaysWithinSpan(assignment, absence?.blockedDays ?? new Set()));
    const away = (absence?.segments ?? [])
      .filter((segment) => segment.dayIndices.some((day) => absentDays.has(day)))
      .map((segment) => `${t(availabilityKindMessageKey(segment.kind))} ${segment.dateRangeLabel}`);
    const parallel = overloadingAssignments(assignment, assignmentsByMember.get(assignment.memberId) ?? []).map(
      rowTitleOf
    );
    const blockers = (violatedBlockers.get(assignment.id) ?? []).map((blocker) =>
      t('quarterlyPlan.issueBlocked', { title: rowTitleOf(blocker) })
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

  const toneClass = quarterBarToneClass(statusKey);

  return assignments.map((assignment) => (
    <QuarterlyPlanBar
      key={assignment.id}
      assignment={assignment}
      faded={faded}
      issues={issuesOf(assignment)}
      lane={laneById.get(assignment.id) ?? 0}
      member={memberById.get(assignment.memberId)}
      risks={risksOf(assignment)}
      toneClass={toneClass}
    />
  ));
}
