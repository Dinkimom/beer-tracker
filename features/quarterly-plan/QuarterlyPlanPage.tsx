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
import { collectQuarterlyPlanIssues, quarterTimelineStart } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import {
  addDirection,
  addEpic,
  planIssueKeys,
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

import { QuarterlyPlanAgentIsland } from './components/QuarterlyPlanAgentIsland';
import { QuarterlyPlanBoard } from './components/QuarterlyPlanBoard';
import { QuarterlyPlanMenu } from './components/QuarterlyPlanMenu';
import { QuarterlyPlanToolbar } from './components/QuarterlyPlanToolbar';
import { QuarterlyPlanTrackerEpicDialog } from './components/QuarterlyPlanTrackerEpicDialog';
import { QuarterlyPlanBoardProvider } from './QuarterlyPlanBoardContext';
import {
  buildAbsenceByMember,
  buildToneByKey,
} from './quarterlyPlanBoardModel';
import { applyTrackerPickToPlan, buildQuarterlyPlanMenuSections, trackerPickBoardId } from './quarterlyPlanMenuSections';
import { useQuarterlyPlan } from './useQuarterlyPlan';
import { useQuarterlyPlanAgent, useQuarterlyPlanDraftPreview } from './useQuarterlyPlanAgent';
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
  const { applyEdit: savePlanEdit, eventsByBoard, isLoading, plan: savedPlan, setVersion } = useQuarterlyPlan(quarterRef);
  const agent = useQuarterlyPlanAgent(quarterRef, setVersion);
  const [agentOpen, setAgentOpen] = useState(false);
  /** План на доске — с черновиком агента, пока он показан (QM9): доска, проблемы и меню считают по нему. */
  const draftView = useQuarterlyPlanDraftPreview({ agent, draft: agent.draft, savedPlan, saveEdit: savePlanEdit });
  const { after: planAfterDraft, applyEdit, plan } = draftView;

  const weeks = useMemo(() => buildQuarterWeeks(quarterRef), [quarterRef]);
  const timelineStart = useMemo(() => quarterTimelineStart(weeks), [weeks]);
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

  // Проблемы — по плану после черновика: убранное черновиком стоит на доске, но в счёт не идёт.
  const issues = useMemo(
    () => (planAfterDraft ? collectQuarterlyPlanIssues(planAfterDraft, absenceByMember, hideDone) : []),
    [absenceByMember, hideDone, planAfterDraft]
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
      notInTeamAssignmentIds: new Set(issues.filter((issue) => issue.notInTeam).map((issue) => issue.assignmentId)),
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
      draftMarks: draftView.marks,
      draftReview: draftView.review,
      timelineStart,
      trackerEpics: plan.trackerEpics,
      violatedBlockers: violatedBlockersByAssignment(plan),
      weeks,
    };
  }, [absenceByMember, applyEdit, draft, draftView.marks, draftView.review, focusedIssue, issues, linksBoard, notesBoard, plan, submitDraft, timelineStart, weeks]);

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

  const applyTrackerPick = (issueKey: string, title: string) => {
    if (!trackerPick) return;
    applyEdit((content) => applyTrackerPickToPlan(content, trackerPick, { issueKey, title }));
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
                boardId={trackerPickBoardId(plan, trackerPick)}
                direction={trackerPick.kind === 'linkDirection'}
                usedIssueKeys={new Set(planIssueKeys(plan))}
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
        <QuarterlyPlanAgentIsland agent={agent} chatOpen={agentOpen} draftView={draftView} />
        <QuarterlyPlanToolbar
          agent={
            agent.agentVisible
              ? {
                  brand: agent.brand,
                  open: agentOpen,
                  openComments: agent.openComments,
                  status: agent.status,
                  onToggle: () => setAgentOpen((open) => !open),
                }
              : null
          }
          hideDone={hideDone}
          issueCounts={{
            away: issues.filter((issue) => issue.away).length,
            blocked: issues.filter((issue) => issue.blocked).length,
            notInTeam: issues.filter((issue) => issue.notInTeam).length,
            parallel: issues.filter((issue) => issue.parallel).length,
            total: issues.length,
          }}
          linkTool={planLinks.armed}
          noteColor={notes.noteColor}
          noteTool={notes.noteTool}
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
