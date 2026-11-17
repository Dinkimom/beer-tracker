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
import type { QuarterlyPlanAssignment, QuarterlyPlanSprint, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useCallback, useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { TaskBarNoteFocusEditor } from '@/features/task/components/TaskBar/TaskBarNoteFocusEditor';
import { formatLocalDateToIsoDateOnly } from '@/lib/isoDateOnlyCalendar';
import { collectQuarterlyPlanIssues, quarterTimelineStart } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import {
  addDirection,
  addEpic,
  assignmentPhase,
  daySpanOf,
  epicTitle,
  planIssueKeys,
  removeDirection,
  removeEpic,
  updateAssignment,
  updateDirection,
  updateEpic,
  violatedBlockersByAssignment,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { collectUnsplitDirectionIds } from '@/lib/quarterlyPlans/quarterlyPlanPhases';
import { epicRowIds, moveDirection, moveEpic, rivalAssignments, tasksByEpic } from '@/lib/quarterlyPlans/quarterlyPlanRows';
import {
  buildQuarterWeeks,
  QUARTER_WORKING_DAYS_PER_WEEK,
  quarterOfDate,
  weekIndexOfDate,
} from '@/lib/quarterlyPlans/quarterWeeks';
import { getPlannerNow } from '@/utils/plannerClock';

import { QuarterlyPlanAgentIsland } from './components/QuarterlyPlanAgentIsland';
import { QuarterlyPlanBoard } from './components/QuarterlyPlanBoard';
import { QuarterlyPlanHistorySidebar } from './components/QuarterlyPlanHistorySidebar';
import { QuarterlyPlanMenu } from './components/QuarterlyPlanMenu';
import { QuarterlyPlanSprintGoals } from './components/QuarterlyPlanSprintGoals';
import { QuarterlyPlanSprintSyncDialog } from './components/QuarterlyPlanSprintSyncDialog';
import { QuarterlyPlanToolbar } from './components/QuarterlyPlanToolbar';
import { QuarterlyPlanTrackerEpicDialog } from './components/QuarterlyPlanTrackerEpicDialog';
import { QuarterlyPlanBoardProvider } from './QuarterlyPlanBoardContext';
import {
  buildAbsenceByMember,
} from './quarterlyPlanBoardModel';
import { applyTrackerPickToPlan, buildQuarterlyPlanMenuSections, trackerPickBoardId } from './quarterlyPlanMenuSections';
import { useClosingValue } from './useClosingValue';
import { useQuarterlyPlan } from './useQuarterlyPlan';
import { useQuarterlyPlanAgent, useQuarterlyPlanDraftPreview } from './useQuarterlyPlanAgent';
import { useQuarterlyPlanHistory, useQuarterlyPlanShownView } from './useQuarterlyPlanHistory';
import { useQuarterlyPlanLinks } from './useQuarterlyPlanLinks';
import { useQuarterlyPlanNotes } from './useQuarterlyPlanNotes';
import { useQuarterlyPlanRowGoals } from './useQuarterlyPlanRowGoals';
import { useQuarterlyPlanSprintSync } from './useQuarterlyPlanSprintSync';
import { useQuarterlyPlanTrackerStatus } from './useQuarterlyPlanTrackerStatus';

function groupBy(
  assignments: readonly QuarterlyPlanAssignment[],
  key: 'directionId' | 'epicId' | 'memberId'
): Map<string, QuarterlyPlanAssignment[]> {
  const groups = new Map<string, QuarterlyPlanAssignment[]>();
  for (const assignment of assignments) {
    const value = assignment[key];
    if (value !== undefined) groups.set(value, [...(groups.get(value) ?? []), assignment]);
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
  /** Меню и превью полосы уходят с анимацией: закрытое меню ещё миг на экране. */
  const closingMenu = useClosingValue(menu);
  const shownMenu = closingMenu.shown;
  /**
   * Пункт меню выбран — превью полосы убираем сразу: на его месте уже настоящая полоса, а гаснущее превью
   * перескочило бы в соседнюю дорожку и раздвинуло строку. Закрыли мимо — превью гаснет вместе с меню.
   */
  const [previewCut, setPreviewCut] = useState(false);
  if (menu !== null && previewCut) setPreviewCut(false);
  const [draft, setDraft] = useState<QuarterlyPlanDraft | null>(null);
  const [trackerPick, setTrackerPick] = useState<QuarterlyPlanTrackerPick | null>(null);
  /** Свёрнутые команды и направления: идентификаторы у них не пересекаются. */
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set());
  /** Эпики с раскрытым списком задач: по умолчанию задачи свёрнуты, доска остаётся компактной (QT4). */
  const [expandedEpicIds, setExpandedEpicIds] = useState<ReadonlySet<string>>(new Set());
  const [focusedIssue, setFocusedIssue] = useState<{ assignmentId: string; nonce: number } | null>(null);
  const [todayNonce, setTodayNonce] = useState(0);
  const {
    applyEdit: savePlanEdit,
    eventsByBoard,
    getVersion,
    isLoading,
    plan: savedPlan,
    refreshSprintCards,
    refreshTrackerRow,
    setVersion,
  } = useQuarterlyPlan(quarterRef);
  const history = useQuarterlyPlanHistory({ getVersion, onRestored: setVersion, ref: quarterRef, savedPlan });
  /** Цели спринта в сайдбаре (QG13); одновременно с историей версий не открываются — место одно. */
  const [goalsTarget, setGoalsTarget] = useState<{ boardId: number; sprint: QuarterlyPlanSprint } | null>(null);
  const openSprintGoals = useCallback(
    (sprint: QuarterlyPlanSprint, boardId: number) => {
      history.close();
      setGoalsTarget({ boardId, sprint });
    },
    [history]
  );
  const changeTrackerStatus = useQuarterlyPlanTrackerStatus(refreshTrackerRow);
  const agent = useQuarterlyPlanAgent(quarterRef, setVersion);
  const [agentOpen, setAgentOpen] = useState(false);
  /** План на доске — с черновиком агента, пока он показан (QM9): доска, проблемы и меню считают по нему. */
  const draftView = useQuarterlyPlanDraftPreview({ agent, draft: agent.draft, savedPlan, saveEdit: savePlanEdit });
  /** Выбрана версия из истории (QH4): на доске она, только для просмотра, с пометками её изменений. */
  const shownView = useQuarterlyPlanShownView(draftView, history.preview);
  const { after: planAfterDraft, applyEdit, plan } = shownView;

  const weeks = useMemo(() => buildQuarterWeeks(quarterRef), [quarterRef]);
  const timelineStart = useMemo(() => quarterTimelineStart(weeks), [weeks]);
  const notes = useQuarterlyPlanNotes({ applyEdit, plan, weekCount: weeks.length });
  const rowGoals = useQuarterlyPlanRowGoals(plan, weeks);
  const sprintSync = useQuarterlyPlanSprintSync({ applyEdit, plan, refreshSprintCards, weeks });
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

  const toggleEpic = useCallback((id: string) => {
    setExpandedEpicIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);
  const expandEpic = useCallback((id: string | undefined) => {
    if (id) setExpandedEpicIds((current) => new Set(current).add(id));
  }, []);
  /** Поле новой задачи открывается в раскрытом эпике и оставляет его раскрытым. */
  const startDraft = useCallback(
    (next: QuarterlyPlanDraft) => {
      if (next.kind === 'newEpic') expandEpic(next.parentEpicId);
      setDraft(next);
    },
    [expandEpic]
  );

  /** Следующее пересечение по порядку доски; свёрнутые команда, направление и эпик задачи раскрываются. */
  const focusNextIssue = () => {
    const index = issues.findIndex((issue) => issue.assignmentId === focusedIssue?.assignmentId);
    const next = issues[(index + 1) % issues.length];
    if (!next) return;
    const epicId = plan?.assignments.find((assignment) => assignment.id === next.assignmentId)?.epicId;
    expandEpic(plan?.epics.find((epic) => epic.id === epicId)?.parentEpicId);
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
          return addDirection(content, { id: crypto.randomUUID(), teamId: draft.teamId, title }, draft.afterId);
        }
        if (draft.kind === 'newEpic') {
          const { afterId, directionId, parentEpicId } = draft;
          const epic = { directionId, id: crypto.randomUUID(), ...(parentEpicId ? { parentEpicId } : {}), status: 'backlog' as const, title };
          return addEpic(content, epic, afterId);
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
    const rowById = new Map([...plan.directions, ...plan.epics].map((row) => [row.id, row]));
    const assignmentsByEpic = groupBy(plan.assignments, 'epicId');
    const assignmentsByMember = groupBy(plan.assignments, 'memberId');
    const rivalsOf = rivalAssignments(plan.epics);
    return {
      absenceByMember,
      assignPreview:
        shownMenu?.kind === 'assign' && !previewCut
          ? {
              closing: !closingMenu.open,
              phase: shownMenu.phase ?? (shownMenu.row.kind === 'direction' ? 'discovery' : 'delivery'),
              row: shownMenu.row,
              // Превью — на тех днях, куда встанет полоса: в неделях с дробью, как дорожки полос.
              startWeek: (shownMenu.startDay ?? shownMenu.week * QUARTER_WORKING_DAYS_PER_WEEK) / QUARTER_WORKING_DAYS_PER_WEEK,
              weeks: (shownMenu.days ?? shownMenu.weeks * QUARTER_WORKING_DAYS_PER_WEEK) / QUARTER_WORKING_DAYS_PER_WEEK,
            }
          : null,
      assignmentsByDirection: groupBy(plan.assignments, 'directionId'),
      assignmentsByEpic,
      assignmentsByEpicTree: new Map(
        plan.epics.map((epic) => [
          epic.id,
          [...epicRowIds(plan.epics, epic.id)].flatMap((rowId) => assignmentsByEpic.get(rowId) ?? []),
        ])
      ),
      currentWeek: weekIndexOfDate(weeks, getPlannerNow()),
      dayCount: weeks.length * QUARTER_WORKING_DAYS_PER_WEEK,
      draft,
      expandedEpicIds,
      focusedIssue,
      goalsByRow: rowGoals,
      hideDone,
      issueCountByTeam: issues.reduce(
        (counts, issue) => counts.set(issue.teamId, (counts.get(issue.teamId) ?? 0) + 1),
        new Map<string, number>()
      ),
      memberById: new Map(members.map((member) => [member.id, member])),
      notInTeamAssignmentIds: new Set(issues.filter((issue) => issue.notInTeam).map((issue) => issue.assignmentId)),
      ...linksBoard,
      ...notesBoard,
      onBarChange: (assignmentId, span) =>
        applyEdit((content) => updateAssignment(content, assignmentId, span)),
      onBarClick: (assignmentId, anchor) => setMenu({ anchor, assignmentId, kind: 'bar' }),
      onCellClick: (row, week, anchor, span) => setMenu({ anchor, kind: 'assign', row, week, weeks: 1, ...span }),
      onDraftSubmit: submitDraft,
      onRowMenu: (target, anchor) => setMenu({ anchor, kind: 'row', target }),
      onRowMove: (level, id, anchorId, place) =>
        applyEdit((content) =>
          level === 'direction' ? moveDirection(content, id, anchorId, place) : moveEpic(content, id, anchorId, place)
        ),
      onStartDraft: startDraft,
      onStatusClick: (epicId, anchor) => setMenu({ anchor, epicId, kind: 'status' }),
      onSprintDriftClick: (epicId, anchor) => setMenu({ anchor, epicId, kind: 'sprintDrift' }),
      onSprintGoalsOpen: openSprintGoals,
      onToggleEpic: toggleEpic,
      onTrackerStatusChange: (...change) => void changeTrackerStatus(...change),
      rivalAssignmentsOf: (assignment) => rivalsOf(assignment, assignmentsByMember.get(assignment.memberId) ?? []),
      rowTitleOf: (assignment) => {
        const row = rowById.get(assignment.epicId ?? assignment.directionId ?? '');
        return row ? epicTitle(row, plan.trackerEpics) : '';
      },
      draftMarks: shownView.marks,
      draftReview: shownView.review,
      sprintCards: plan.sprintCards,
      tasksByEpic: tasksByEpic(plan.epics),
      timelineStart,
      trackerEpics: plan.trackerEpics,
      unsplitDirectionIds: new Set(
        collectUnsplitDirectionIds(plan, weeks, formatLocalDateToIsoDateOnly(getPlannerNow()))
      ),
      violatedBlockers: violatedBlockersByAssignment(plan),
      weeks,
    };
  }, [absenceByMember, closingMenu.open, previewCut, shownMenu, applyEdit, draft, shownView.marks, shownView.review, openSprintGoals, expandedEpicIds, focusedIssue, hideDone, changeTrackerStatus, rowGoals, issues, linksBoard, notesBoard, plan, startDraft, submitDraft, timelineStart, toggleEpic, weeks]);

  const confirmThen = (message: string, action: () => void) => {
    confirm(message, { variant: 'destructive' })
      .then((confirmed) => {
        if (confirmed) action();
      })
      .catch(() => undefined);
  };

  const rowActions: QuarterlyPlanRowActions = {
    onStartLink: planLinks.startFrom,
    onAssignMore: (assignment) =>
      setMenu((current) =>
        current
          ? {
              anchor: current.anchor,
              kind: 'assign',
              phase: assignmentPhase(assignment),
              row: assignment.epicId
                ? { id: assignment.epicId, kind: 'epic' }
                : { id: assignment.directionId ?? '', kind: 'direction' },
              week: assignment.startWeek,
              weeks: assignment.weeks,
              ...daySpanOf(assignment),
            }
          : null
      ),
    onOpenSprintSync: (rowId) => sprintSync.open(new Set([rowId])),
    onSyncDrift: (drift, to) => sprintSync.apply([{ drift, to }]),
    onAssignPhase: (phase) => setMenu((current) => (current?.kind === 'assign' ? { ...current, phase } : current)),
    onPickTrackerEpic: setTrackerPick,
    onRemoveDirection: (directionId) =>
      confirmThen(t('quarterlyPlan.removeDirectionConfirm'), () =>
        applyEdit((content) => removeDirection(content, directionId))
      ),
    // Пустую строку убираем сразу; эпик с назначениями или задачами — после подтверждения, отмены на доске нет.
    onRemoveEpic: (epicId) => {
      const remove = () => applyEdit((content) => removeEpic(content, epicId));
      const rowIds = epicRowIds(plan?.epics ?? [], epicId);
      if (rowIds.size > 1 || plan?.assignments.some((assignment) => assignment.epicId === epicId)) {
        confirmThen(t('quarterlyPlan.removeEpicConfirm'), remove);
      } else {
        remove();
      }
    },
    onStartDraft: startDraft,
  };

  const applyTrackerPick = (issueKey: string, title: string) => {
    if (!trackerPick) return;
    applyEdit((content) => applyTrackerPickToPlan(content, trackerPick, { issueKey, title }));
    if (trackerPick.kind === 'add') expandEpic(trackerPick.parentEpicId);
    setTrackerPick(null);
  };

  return (
    // История версий — сайдбар рядом с доской, как на доске спринта: доска сужается, а не закрывается им.
    <div className="relative flex min-h-0 flex-1 gap-3 overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header">
        {plan && board ? (
          <QuarterlyPlanBoardProvider value={board}>
            <QuarterlyPlanBoard
              collapsedIds={collapsedIds}
              hideDone={hideDone}
              plan={plan}
              todayNonce={todayNonce}
              onToggle={toggleCollapsed}
            />
            {shownMenu ? (
              <QuarterlyPlanMenu
                anchor={shownMenu.anchor}
                open={closingMenu.open}
                sections={buildQuarterlyPlanMenuSections({
                  absenceByMember,
                  actions: rowActions,
                  applyEdit,
                  menu: shownMenu,
                  plan,
                  t,
                  weeks,
                })}
                onClose={(reason) => {
                  setPreviewCut(reason === 'select');
                  setMenu(null);
                }}
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
          history={{
            open: history.open,
            onToggle: () => {
              setGoalsTarget(null);
              history.toggle();
            },
          }}
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
          sprintSync={{ count: sprintSync.count, onOpen: () => sprintSync.open() }}
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
      <QuarterlyPlanHistorySidebar
        loading={history.loading}
        open={history.open}
        previewLoading={history.previewLoading}
        restoring={history.restoring}
        selectedId={history.selectedId}
        versions={history.versions}
        onClose={history.close}
        onRestore={history.restore}
        onSelect={history.select}
      />
      <QuarterlyPlanSprintGoals target={goalsTarget} onClose={() => setGoalsTarget(null)} />
      <QuarterlyPlanSprintSyncDialog
        key={sprintSync.openCount}
        busy={sprintSync.busy}
        drifts={sprintSync.drifts}
        open={sprintSync.opened}
        onApply={sprintSync.apply}
        onClose={sprintSync.close}
      />
      {DialogComponent}
    </div>
  );
}
