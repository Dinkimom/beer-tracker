'use client';

import type {
  QuarterlyPlanBoardContextValue,
  QuarterlyPlanDraft,
} from './QuarterlyPlanBoardContext';
import type {
  QuarterlyPlanMenuState,
  QuarterlyPlanRowActions,
  QuarterlyPlanTrackerPick,
} from './quarterlyPlanMenuSections';
import type { QuarterlyPlanAssignment, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useCallback, useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskBarNoteFocusEditor } from '@/features/task/components/TaskBar/TaskBarNoteFocusEditor';
import {
  addDirection,
  addEpic,
  removeDirection,
  removeEpic,
  updateAssignment,
  updateDirection,
  updateEpic,
  violatedBlockersByAssignment,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import {
  buildQuarterWeeks,
  QUARTER_WORKING_DAYS_PER_WEEK,
  quarterOfDate,
  weekIndexOfDate,
} from '@/lib/quarterlyPlans/quarterWeeks';
import { getPlannerNow } from '@/utils/plannerClock';

import { QuarterlyPlanBoard } from './components/QuarterlyPlanBoard';
import { QuarterlyPlanMenu } from './components/QuarterlyPlanMenu';
import { QuarterlyPlanToolbar } from './components/QuarterlyPlanToolbar';
import { QuarterlyPlanTrackerEpicDialog } from './components/QuarterlyPlanTrackerEpicDialog';
import { QuarterlyPlanBoardProvider } from './QuarterlyPlanBoardContext';
import {
  buildAbsenceByMember,
  buildToneByKey,
  collectQuarterlyPlanIssues,
  quarterTimelineStart,
} from './quarterlyPlanBoardModel';
import { buildQuarterlyPlanMenuSections } from './quarterlyPlanMenuSections';
import { useQuarterlyPlan } from './useQuarterlyPlan';
import { useQuarterlyPlanLinks } from './useQuarterlyPlanLinks';
import { useQuarterlyPlanNotes } from './useQuarterlyPlanNotes';

function groupBy(
  assignments: readonly QuarterlyPlanAssignment[],
  key: 'epicId' | 'memberId'
): Map<string, QuarterlyPlanAssignment[]> {
  const groups = new Map<string, QuarterlyPlanAssignment[]>();
  for (const assignment of assignments) {
    groups.set(assignment[key], [...(groups.get(assignment[key]) ?? []), assignment]);
  }
  return groups;
}

/**
 * Квартальный план организации: все команды в одной сетке недель.
 * Направления (вехи) и эпики по командам; отпуска и дежурства — общие с доской спринта.
 */
export function QuarterlyPlanPage() {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const [quarterRef, setQuarterRef] = useState<QuarterRef>(() => quarterOfDate(getPlannerNow()));
  const [hideDone, setHideDone] = useState(false);
  const [menu, setMenu] = useState<QuarterlyPlanMenuState | null>(null);
  const [draft, setDraft] = useState<QuarterlyPlanDraft | null>(null);
  const [trackerPick, setTrackerPick] = useState<QuarterlyPlanTrackerPick | null>(null);
  /** Свёрнутые команды и направления: идентификаторы у них не пересекаются. */
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set());
  const [focusedIssue, setFocusedIssue] = useState<{ assignmentId: string; nonce: number } | null>(null);
  const [todayNonce, setTodayNonce] = useState(0);
  const { applyEdit, eventsByBoard, isLoading, plan } = useQuarterlyPlan(quarterRef);

  const weeks = useMemo(() => buildQuarterWeeks(quarterRef), [quarterRef]);
  const notes = useQuarterlyPlanNotes({ applyEdit, plan, weekCount: weeks.length });
  const confirmLinkDelete = useCallback(
    () =>
      confirm(t('sprintPlanner.links.removeConfirm'), {
        cancelText: t('sprintPlanner.links.removeCancelAction'),
        confirmText: t('sprintPlanner.links.removeConfirmAction'),
        title: t('sprintPlanner.links.removeTitle'),
        variant: 'destructive',
      }),
    [confirm, t]
  );
  const planLinks = useQuarterlyPlanLinks({ applyEdit, confirmDelete: confirmLinkDelete, plan });
  const absenceByMember = useMemo(
    () => buildAbsenceByMember(plan?.teams ?? [], eventsByBoard, weeks),
    [eventsByBoard, plan?.teams, weeks]
  );

  const issues = useMemo(
    () => (plan ? collectQuarterlyPlanIssues(plan, absenceByMember, hideDone) : []),
    [absenceByMember, hideDone, plan]
  );

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  /** Следующее пересечение по порядку доски; свёрнутые команда и направление раскрываются. */
  const focusNextIssue = () => {
    const index = issues.findIndex((issue) => issue.assignmentId === focusedIssue?.assignmentId);
    const next = issues[(index + 1) % issues.length];
    if (!next) return;
    setCollapsedIds((current) => {
      const expanded = new Set(current);
      expanded.delete(next.teamId);
      expanded.delete(next.directionId);
      return expanded;
    });
    setFocusedIssue({ assignmentId: next.assignmentId, nonce: (focusedIssue?.nonce ?? 0) + 1 });
  };

  const submitDraft = useCallback(
    (title: string | null) => {
      setDraft(null);
      if (!draft || !title) return;
      applyEdit((content) => {
        if (draft.kind === 'newDirection') {
          return addDirection(content, { id: crypto.randomUUID(), teamId: draft.teamId, title });
        }
        if (draft.kind === 'newEpic') {
          return addEpic(content, { directionId: draft.directionId, id: crypto.randomUUID(), status: 'backlog', title });
        }
        return draft.kind === 'renameDirection'
          ? updateDirection(content, draft.id, { title })
          : updateEpic(content, draft.id, { title });
      });
    },
    [applyEdit, draft]
  );

  const notesBoard = notes.board;
  const linksBoard = planLinks.board;
  const board = useMemo<QuarterlyPlanBoardContextValue | null>(() => {
    if (!plan) return null;
    const members = plan.teams.flatMap((team) => team.members);
    return {
      absenceByMember,
      assignmentsByEpic: groupBy(plan.assignments, 'epicId'),
      assignmentsByMember: groupBy(plan.assignments, 'memberId'),
      currentWeek: weekIndexOfDate(weeks, getPlannerNow()),
      dayCount: weeks.length * QUARTER_WORKING_DAYS_PER_WEEK,
      draft,
      epicById: new Map(plan.epics.map((epic) => [epic.id, epic])),
      focusedIssue,
      issueCountByTeam: issues.reduce(
        (counts, issue) => counts.set(issue.teamId, (counts.get(issue.teamId) ?? 0) + 1),
        new Map<string, number>()
      ),
      memberById: new Map(members.map((member) => [member.id, member])),
      memberToneById: buildToneByKey(members.map((member) => member.id)),
      ...linksBoard,
      ...notesBoard,
      onBarChange: (assignmentId, span) =>
        applyEdit((content) => updateAssignment(content, assignmentId, span)),
      onBarClick: (assignmentId, anchor) => setMenu({ anchor, assignmentId, kind: 'bar' }),
      onCellClick: (epicId, week, anchor) => setMenu({ anchor, epicId, kind: 'assign', week, weeks: 1 }),
      onDraftSubmit: submitDraft,
      onRowMenu: (target, anchor) => setMenu({ anchor, kind: 'row', target }),
      onStartDraft: setDraft,
      onStatusClick: (epicId, anchor) => setMenu({ anchor, epicId, kind: 'status' }),
      timelineStart: quarterTimelineStart(weeks),
      violatedBlockers: violatedBlockersByAssignment(plan),
      weeks,
    };
  }, [absenceByMember, applyEdit, draft, focusedIssue, issues, linksBoard, notesBoard, plan, submitDraft, weeks]);

  const confirmThen = (message: string, action: () => void) => {
    confirm(message, { variant: 'destructive' })
      .then((confirmed) => {
        if (confirmed) action();
      })
      .catch(() => undefined);
  };

  const rowActions: QuarterlyPlanRowActions = {
    onStartLink: planLinks.startFrom,
    onAssignMore: (epicId, span) =>
      setMenu((current) =>
        current ? { anchor: current.anchor, epicId, kind: 'assign', week: span.startWeek, weeks: span.weeks } : null
      ),
    onPickTrackerEpic: setTrackerPick,
    onRemoveDirection: (directionId) =>
      confirmThen(t('quarterlyPlan.removeDirectionConfirm'), () =>
        applyEdit((content) => removeDirection(content, directionId))
      ),
    // Пустую строку убираем сразу; эпик с назначениями — после подтверждения, отмены на доске нет.
    onRemoveEpic: (epicId) => {
      const remove = () => applyEdit((content) => removeEpic(content, epicId));
      if (plan?.assignments.some((assignment) => assignment.epicId === epicId)) {
        confirmThen(t('quarterlyPlan.removeEpicConfirm'), remove);
      } else {
        remove();
      }
    },
    onStartDraft: setDraft,
  };

  /** Доска команды, к которой относится строка: по ней ищем в трекере. */
  const boardIdOfPick = (pick: QuarterlyPlanTrackerPick): number => {
    const directionId =
      pick.kind === 'add' ? pick.directionId : plan?.epics.find((epic) => epic.id === pick.epicId)?.directionId;
    const teamId = plan?.directions.find((direction) => direction.id === directionId)?.teamId;
    return plan?.teams.find((team) => team.id === teamId)?.boardId ?? 0;
  };

  const applyTrackerPick = (issueKey: string, title: string) => {
    if (!trackerPick) return;
    applyEdit((content) =>
      trackerPick.kind === 'add'
        ? addEpic(content, {
            directionId: trackerPick.directionId,
            id: crypto.randomUUID(),
            issueKey,
            status: 'backlog',
            title,
          })
        : updateEpic(content, trackerPick.epicId, { issueKey, title })
    );
    setTrackerPick(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header">
        {plan && board ? (
          <QuarterlyPlanBoardProvider value={board}>
            <QuarterlyPlanBoard
              collapsedIds={collapsedIds}
              hideDone={hideDone}
              plan={plan}
              todayNonce={todayNonce}
              onToggle={toggleCollapsed}
            />
            {menu ? (
              <QuarterlyPlanMenu
                anchor={menu.anchor}
                sections={buildQuarterlyPlanMenuSections({
                  absenceByMember,
                  actions: rowActions,
                  applyEdit,
                  menu,
                  plan,
                  t,
                  weeks,
                })}
                onClose={() => setMenu(null)}
              />
            ) : null}
            {notes.focusEditor ? (
              <TaskBarNoteFocusEditor
                developers={plan.teams.flatMap((team) => team.members)}
                editor={{ ...notes.focusEditor.editor, placeholder: t('comments.placeholder') }}
                getAnchor={notes.focusEditor.getAnchor}
                onCollapse={notes.focusEditor.onCollapse}
              />
            ) : null}
            {trackerPick ? (
              <QuarterlyPlanTrackerEpicDialog
                boardId={boardIdOfPick(trackerPick)}
                usedIssueKeys={new Set(plan.epics.flatMap((epic) => (epic.issueKey ? [epic.issueKey] : [])))}
                onClose={() => setTrackerPick(null)}
                onPick={applyTrackerPick}
              />
            ) : null}
          </QuarterlyPlanBoardProvider>
        ) : (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-ds-text-muted">
            {isLoading ? <Icon className="h-4 w-4 animate-spin" name="spinner" /> : null}
            {t(isLoading ? 'quarterlyPlan.loading' : 'quarterlyPlan.loadError')}
          </div>
        )}
        <QuarterlyPlanToolbar
          awayCount={issues.filter((issue) => issue.away).length}
          blockedCount={issues.filter((issue) => issue.blocked).length}
          hideDone={hideDone}
          issueCount={issues.length}
          linkTool={planLinks.armed}
          noteColor={notes.noteColor}
          noteTool={notes.noteTool}
          parallelCount={issues.filter((issue) => issue.parallel).length}
          quarterRef={quarterRef}
          onHideDoneChange={setHideDone}
          onLinkToolChange={(active) => {
            planLinks.setArmed(active);
            if (active) notes.setNoteTool(false);
          }}
          onNextIssue={focusNextIssue}
          onNoteColorChange={notes.setNoteColor}
          onNoteToolChange={(active) => {
            notes.setNoteTool(active);
            if (active) planLinks.setArmed(false);
          }}
          onQuarterChange={setQuarterRef}
          onToday={() => {
            setQuarterRef(quarterOfDate(getPlannerNow()));
            setTodayNonce((nonce) => nonce + 1);
          }}
        />
      </div>
      {DialogComponent}
    </div>
  );
}
