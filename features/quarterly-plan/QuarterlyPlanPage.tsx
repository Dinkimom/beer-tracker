'use client';

import type {
  QuarterlyPlanBoardContextValue,
} from './QuarterlyPlanBoardContext';
import type {
  QuarterlyPlanMenuState,
  QuarterlyPlanRowActions,
  QuarterlyPlanTrackerPick,
} from './quarterlyPlanMenuSections';
import type { QuarterlyPlanSprint, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { useCallback, useMemo, useState } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { TaskBarNoteFocusEditor } from '@/features/task/components/TaskBar/TaskBarNoteFocusEditor';
import { useHeightCssVar } from '@/hooks/useHeightCssVar';
import { useQuarterHideDoneStorage } from '@/hooks/useLocalStorage';
import {
  assignmentPhase,
  daySpanOf,
  planIssueKeys,
  removeDirection,
  removeEpic,
  updateAssignment,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { epicRowIds, moveDirection, moveEpic } from '@/lib/quarterlyPlans/quarterlyPlanRows';
import {
  buildQuarterWeeks,
  QUARTER_WORKING_DAYS_PER_WEEK,
  quarterOfDate,
} from '@/lib/quarterlyPlans/quarterWeeks';
import { randomUuid } from '@/lib/randomUuid';
import { getPlannerNow } from '@/utils/plannerClock';

import { QuarterlyPlanAgentIsland } from './components/QuarterlyPlanAgentIsland';
import { QuarterlyPlanBoard } from './components/QuarterlyPlanBoard';
import { QuarterlyPlanHeader } from './components/QuarterlyPlanHeader';
import { QuarterlyPlanHistorySidebar } from './components/QuarterlyPlanHistorySidebar';
import { QuarterlyPlanMenu } from './components/QuarterlyPlanMenu';
import { QuarterlyPlanSprintGoals } from './components/QuarterlyPlanSprintGoals';
import { QuarterlyPlanSprintSyncDialog } from './components/QuarterlyPlanSprintSyncDialog';
import { QuarterlyPlanToolbar } from './components/QuarterlyPlanToolbar';
import { QuarterlyPlanTrackerEpicDialog } from './components/QuarterlyPlanTrackerEpicDialog';
import { applyDraftTitle, QuarterBoardRows } from './model/quarterBoardRows';
import { QuarterPlanView } from './model/quarterPlanView';
import { QuarterlyPlanBoardProvider, QuarterPlanViewProvider } from './QuarterlyPlanBoardContext';
import { applyTrackerPickToPlan, buildQuarterlyPlanMenuSections, trackerPickBoardId } from './quarterlyPlanMenuSections';
import { QuarterlyPlanPresence } from './QuarterlyPlanPresence';
import { useClosingValue } from './useClosingValue';
import { useQuarterDetail } from './useQuarterDetail';
import { useQuarterlyPlan } from './useQuarterlyPlan';
import { useQuarterlyPlanAgent, useQuarterlyPlanDraftPreview } from './useQuarterlyPlanAgent';
import { useQuarterlyPlanHistory, useQuarterlyPlanShownView } from './useQuarterlyPlanHistory';
import { useQuarterlyPlanLinks } from './useQuarterlyPlanLinks';
import { useQuarterlyPlanNotes } from './useQuarterlyPlanNotes';
import { useQuarterlyPlanRowGoals } from './useQuarterlyPlanRowGoals';
import { useQuarterlyPlanSprintSync } from './useQuarterlyPlanSprintSync';
import { useQuarterlyPlanTrackerStatus } from './useQuarterlyPlanTrackerStatus';

/**
 * Квартальный план организации: все команды в одной сетке недель.
 * Направления (вехи) и эпики по командам; отпуска и дежурства — общие с доской спринта.
 */
const NO_ISSUES: QuarterPlanView['issues'] = [];
const NO_ISSUE_COUNTS: QuarterPlanView['issueCounts'] = { away: 0, blocked: 0, notInTeam: 0, parallel: 0, total: 0 };

export function QuarterlyPlanPage() {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const [quarterRef, setQuarterRef] = useState<QuarterRef>(() => quarterOfDate(getPlannerNow()));
  const [hideDone, setHideDone] = useQuarterHideDoneStorage();
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
  const [trackerPick, setTrackerPick] = useState<QuarterlyPlanTrackerPick | null>(null);
  /** Свёрнутое, раскрытое, поле ввода и переход к проблеме — вид этой вкладки, не план. */
  const [rows] = useState(() => new QuarterBoardRows());
  const [todayNonce, setTodayNonce] = useState(0);
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [controlsEl, setControlsEl] = useState<HTMLDivElement | null>(null);
  useHeightCssVar(frameEl, controlsEl, '--planner-controls-h');
  const {
    applyEdit: savePlanEdit,
    eventsByBoard,
    getVersion,
    isLoading,
    plan: savedPlan,
    presenceViewers,
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
  const { detail, setDetail } = useQuarterDetail(plan?.epics, rows);

  const weeks = useMemo(() => buildQuarterWeeks(quarterRef), [quarterRef]);
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
  const planLinks = useQuarterlyPlanLinks({ applyEdit, confirmDelete: confirmLinkDelete, plan, quarterView: detail === 'quarter' });
  const view = useMemo(
    () =>
      plan
        ? new QuarterPlanView({ eventsByBoard, hideDone, now: getPlannerNow(), plan, planAfterDraft: planAfterDraft ?? plan, weeks })
        : null,
    [eventsByBoard, hideDone, plan, planAfterDraft, weeks]
  );
  const issues = view?.issues ?? NO_ISSUES;

  const submitDraft = useCallback(
    (title: string | null) => {
      const draft = rows.takeDraft();
      if (draft && title) applyEdit((content) => applyDraftTitle(content, draft, title, randomUuid()));
    },
    [applyEdit, rows]
  );

  const notesBoard = notes.board;
  const linksBoard = planLinks.board;
  const board = useMemo<QuarterlyPlanBoardContextValue | null>(() => {
    if (!plan) return null;
    return {
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
      detail,
      goalsByRow: rowGoals,
      hideDone,
      ...linksBoard,
      ...notesBoard,
      onBarChange: (assignmentId, span) =>
        applyEdit((content) => updateAssignment(content, assignmentId, span)),
      onBarClick: (assignmentId, anchor) => setMenu({ anchor, assignmentId, kind: 'bar' }),
      onCellClick: (row, week, anchor, span) => setMenu({ anchor, kind: 'assign', row, week, weeks: 1, ...span }),
      onDraftSubmit: submitDraft,
      rows,
      onRowMenu: (target, anchor) => setMenu({ anchor, kind: 'row', target }),
      onRowMove: (level, id, anchorId, place) =>
        applyEdit((content) =>
          level === 'direction' ? moveDirection(content, id, anchorId, place) : moveEpic(content, id, anchorId, place)
        ),
      onStatusClick: (epicId, anchor) => setMenu({ anchor, epicId, kind: 'status' }),
      onSprintDriftClick: (epicId, anchor) => setMenu({ anchor, epicId, kind: 'sprintDrift' }),
      onSprintGoalsOpen: openSprintGoals,
      onTrackerStatusChange: (...change) => void changeTrackerStatus(...change),
      draftMarks: shownView.marks,
      draftReview: shownView.review,
      // Уровень «Квартал» — вид для бизнеса (QZ3): без расхождений со спринтом.
      sprintCards: detail === 'quarter' ? {} : plan.sprintCards,
    };
  }, [closingMenu.open, previewCut, shownMenu, applyEdit, shownView.marks, shownView.review, openSprintGoals, detail, hideDone, changeTrackerStatus, rowGoals, linksBoard, notesBoard, plan, rows, submitDraft]);

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
    onStartDraft: rows.startDraft,
  };

  const applyTrackerPick = (issueKey: string, title: string) => {
    if (!trackerPick) return;
    applyEdit((content) => applyTrackerPickToPlan(content, trackerPick, { issueKey, title }));
    if (trackerPick.kind === 'add') rows.expandEpic(trackerPick.parentEpicId);
    setTrackerPick(null);
  };

  return (
    // История версий — сайдбар рядом с доской, как на доске спринта: доска сужается, а не закрывается им.
    <div className="relative flex min-h-0 flex-1 gap-3 overflow-hidden">
      <div
        ref={setFrameEl}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header"
      >
        {/* Панель контролов — стекло поверх доски, как на доске спринта: строки проезжают под ней размытыми. */}
        <div
          ref={setControlsEl}
          className={`absolute inset-x-0 top-0 ${FLOATING_TOOLBAR_GLASS}`}
          style={{ zIndex: ZIndex.plannerControls }}
        >
          <QuarterlyPlanHeader
            detail={detail}
            history={{
              open: history.open,
              onToggle: () => {
                setGoalsTarget(null);
                history.toggle();
              },
            }}
            issueCounts={view?.issueCounts ?? NO_ISSUE_COUNTS}
            presenceViewers={presenceViewers}
            quarterRef={quarterRef}
            sprintSync={{ count: sprintSync.count, onOpen: () => sprintSync.open() }}
            onDetailChange={setDetail}
            onNextIssue={() => plan && rows.focusNextIssue(issues, plan)}
            onQuarterChange={setQuarterRef}
            onToday={() => {
              setQuarterRef(quarterOfDate(getPlannerNow()));
              setTodayNonce((nonce) => nonce + 1);
            }}
          />
        </div>
        {plan && board && view ? (
          <QuarterPlanViewProvider value={view}>
          <QuarterlyPlanBoardProvider value={board}>
            <QuarterlyPlanPresence quarterRef={quarterRef} viewers={presenceViewers}>
              <QuarterlyPlanBoard
                hideDone={hideDone}
                holdWidth={history.open || goalsTarget !== null}
                plan={plan}
                todayNonce={todayNonce}
              />
            </QuarterlyPlanPresence>
            {shownMenu ? (
              <QuarterlyPlanMenu
                anchor={shownMenu.anchor}
                open={closingMenu.open}
                sections={buildQuarterlyPlanMenuSections({
                  absenceByMember: view.absenceByMember,
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
          </QuarterPlanViewProvider>
        ) : (
          <div
            className="flex flex-1 items-center justify-center gap-2 text-sm text-ds-text-muted"
            style={{ paddingTop: 'var(--planner-controls-h, 0px)' }}
          >
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
          linkTool={planLinks.armed}
          noteColor={notes.noteColor}
          noteTool={notes.noteTool}
          notesVisible={notes.notesVisible}
          onHideDoneChange={setHideDone}
          onLinkToolChange={(active) => {
            planLinks.setArmed(active);
            if (active) notes.setNoteTool(false);
          }}
          onNoteColorChange={notes.setNoteColor}
          onNoteToolChange={(active) => {
            notes.setNoteTool(active);
            if (active) planLinks.setArmed(false);
          }}
          onNotesVisibleChange={notes.setNotesVisible}
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
