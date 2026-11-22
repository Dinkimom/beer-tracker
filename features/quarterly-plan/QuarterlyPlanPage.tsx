'use client';

import type {
  QuarterlyPlanBoardContextValue,
} from './QuarterlyPlanBoardContext';
import type {
  QuarterlyPlanRowActions,
  QuarterlyPlanTrackerPick,
} from './quarterlyPlanMenuSections';
import type { QuarterlyPlanSprint, QuarterRef } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useHeightCssVar } from '@/hooks/useHeightCssVar';
import { useQuarterHideDoneStorage, useQuarterNotesVisibleStorage } from '@/hooks/useLocalStorage';
import {
  planIssueKeys,
  removeDirection,
  removeEpic,
  updateAssignment,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { moveDirection, moveEpic } from '@/lib/quarterlyPlans/quarterlyPlanRows';
import {
  buildQuarterWeeks,
  quarterOfDate,
} from '@/lib/quarterlyPlans/quarterWeeks';
import { randomUuid } from '@/lib/randomUuid';
import { getPlannerNow } from '@/utils/plannerClock';

import { QuarterlyPlanAgentIsland } from './components/QuarterlyPlanAgentIsland';
import { QuarterlyPlanBoard } from './components/QuarterlyPlanBoard';
import { QuarterlyPlanBoardMenu } from './components/QuarterlyPlanBoardMenu';
import { QuarterlyPlanHeader } from './components/QuarterlyPlanHeader';
import { QuarterlyPlanHistorySidebar } from './components/QuarterlyPlanHistorySidebar';
import { QuarterlyPlanNoteFocus } from './components/QuarterlyPlanNoteFocus';
import { QuarterlyPlanSprintGoals } from './components/QuarterlyPlanSprintGoals';
import { QuarterlyPlanSprintSyncDialog } from './components/QuarterlyPlanSprintSyncDialog';
import { QuarterlyPlanToolbar } from './components/QuarterlyPlanToolbar';
import { QuarterlyPlanTrackerEpicDialog } from './components/QuarterlyPlanTrackerEpicDialog';
import { QuarterBoardMenu } from './model/quarterBoardMenu';
import { applyDraftTitle, QuarterBoardRows } from './model/quarterBoardRows';
import { type QuarterEditPort, QuarterLinkTool } from './model/quarterLinkTool';
import { QuarterNoteTool } from './model/quarterNoteTool';
import { QuarterPlanView } from './model/quarterPlanView';
import { QuarterlyPlanBoardProvider, QuarterPlanViewProvider } from './QuarterlyPlanBoardContext';
import { applyTrackerPickToPlan, trackerPickBoardId } from './quarterlyPlanMenuSections';
import { QuarterlyPlanPresence } from './QuarterlyPlanPresence';
import { useQuarterDetail } from './useQuarterDetail';
import { useQuarterlyPlan } from './useQuarterlyPlan';
import { useQuarterlyPlanAgent, useQuarterlyPlanDraftPreview } from './useQuarterlyPlanAgent';
import { useQuarterlyPlanHistory, useQuarterlyPlanShownView } from './useQuarterlyPlanHistory';
import { useQuarterlyPlanRowGoals } from './useQuarterlyPlanRowGoals';
import { useQuarterlyPlanSprintSync } from './useQuarterlyPlanSprintSync';
import { useQuarterlyPlanTrackerStatus } from './useQuarterlyPlanTrackerStatus';

/**
 * Квартальный план организации: все команды в одной сетке недель.
 * Направления (вехи) и эпики по командам; отпуска и дежурства — общие с доской спринта.
 */
const NO_EDIT_PORT: QuarterEditPort = { applyEdit: () => undefined, confirmLinkDelete: () => Promise.resolve(false), view: null };
const NO_ISSUES: QuarterPlanView['issues'] = [];
const NO_ISSUE_COUNTS: QuarterPlanView['issueCounts'] = { away: 0, blocked: 0, notInTeam: 0, parallel: 0, total: 0 };

/** Страница — `observer`: панель инструментов показывает включённый инструмент. */
export const QuarterlyPlanPage = observer(function QuarterlyPlanPage() {
  const { t } = useI18n();
  const { confirm, DialogComponent } = useConfirmDialog();
  const [quarterRef, setQuarterRef] = useState<QuarterRef>(() => quarterOfDate(getPlannerNow()));
  const [hideDone, setHideDone] = useQuarterHideDoneStorage();
  /** Меню у точки клика и превью полосы из меню назначения. */
  const [menu] = useState(() => new QuarterBoardMenu());
  const [trackerPick, setTrackerPick] = useState<QuarterlyPlanTrackerPick | null>(null);
  /** Свёрнутое, раскрытое, поле ввода и переход к проблеме — вид этой вкладки, не план. */
  const [rows] = useState(() => new QuarterBoardRows());
  /** Инструментам — план и запись на момент действия: на доске может быть версия из истории или черновик агента. */
  const port = useRef<QuarterEditPort>(NO_EDIT_PORT);
  const [links] = useState(() => new QuarterLinkTool(() => port.current));
  const [notes] = useState(() => new QuarterNoteTool(() => port.current));
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
  const { detail, setDetail } = useQuarterDetail(plan?.epics, rows, links);

  const weeks = useMemo(() => buildQuarterWeeks(quarterRef), [quarterRef]);
  /** Слой «Заметки» (QN7): запоминается в браузере. */
  const [notesVisible, setNotesVisible] = useQuarterNotesVisibleStorage();
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
  const view = useMemo(
    () =>
      plan
        ? new QuarterPlanView({ eventsByBoard, hideDone, now: getPlannerNow(), plan, planAfterDraft: planAfterDraft ?? plan, quarterView: detail === 'quarter', weeks })
        : null,
    [detail, eventsByBoard, hideDone, plan, planAfterDraft, weeks]
  );
  const issues = view?.issues ?? NO_ISSUES;
  useEffect(() => {
    port.current = { applyEdit, confirmLinkDelete, view };
  }, [applyEdit, confirmLinkDelete, view]);
  useEscapeKey(links.escape, { enabled: links.armed });
  useEscapeKey(() => notes.setActive(false), { enabled: notes.active });
  /** Инструмент «Заметка» ставит новый лист — с выключенным слоем его не было бы видно, поэтому слой включается. */
  const setNoteTool = (active: boolean) => {
    notes.setActive(active);
    if (active) setNotesVisible(true);
  };

  const submitDraft = useCallback(
    (title: string | null) => {
      const draft = rows.takeDraft();
      if (draft && title) applyEdit((content) => applyDraftTitle(content, draft, title, randomUuid()));
    },
    [applyEdit, rows]
  );

  const board = useMemo<QuarterlyPlanBoardContextValue | null>(() => {
    if (!plan) return null;
    return {
      menu,
      detail,
      goalsByRow: rowGoals,
      hideDone,
      links,
      notes,
      notesVisible,
      onBarChange: (assignmentId, span) =>
        applyEdit((content) => updateAssignment(content, assignmentId, span)),
      onDraftSubmit: submitDraft,
      rows,
      onRowMove: (level, id, anchorId, place) =>
        applyEdit((content) =>
          level === 'direction' ? moveDirection(content, id, anchorId, place) : moveEpic(content, id, anchorId, place)
        ),
      onSprintGoalsOpen: openSprintGoals,
      onTrackerStatusChange: (...change) => void changeTrackerStatus(...change),
      draftMarks: shownView.marks,
      draftReview: shownView.review,
    };
  }, [applyEdit, shownView.marks, shownView.review, openSprintGoals, detail, hideDone, changeTrackerStatus, rowGoals, links, menu, notes, notesVisible, plan, rows, submitDraft]);

  const confirmThen = (message: string, action: () => void) => {
    confirm(message, { variant: 'destructive' })
      .then((confirmed) => {
        if (confirmed) action();
      })
      .catch(() => undefined);
  };

  const rowActions: QuarterlyPlanRowActions = {
    onStartLink: links.startFrom,
    onAssignMore: menu.assignMore,
    onOpenSprintSync: (rowId) => sprintSync.open(new Set([rowId])),
    onSyncDrift: (drift, to) => sprintSync.apply([{ drift, to }]),
    onAssignPhase: menu.setAssignPhase,
    onPickTrackerEpic: setTrackerPick,
    onRemoveDirection: (directionId) =>
      confirmThen(t('quarterlyPlan.removeDirectionConfirm'), () =>
        applyEdit((content) => removeDirection(content, directionId))
      ),
    onRemoveEpic: (epicId) => {
      const remove = () => applyEdit((content) => removeEpic(content, epicId));
      if (view?.epicRemovalNeedsConfirm(epicId)) confirmThen(t('quarterlyPlan.removeEpicConfirm'), remove);
      else remove();
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
            <QuarterlyPlanBoardMenu actions={rowActions} applyEdit={applyEdit} />
            <QuarterlyPlanNoteFocus />
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
          linkTool={links.armed}
          noteColor={notes.color}
          noteTool={notes.active}
          notesVisible={notesVisible}
          onHideDoneChange={setHideDone}
          onLinkToolChange={(active) => {
            links.setArmed(active);
            if (active) setNoteTool(false);
          }}
          onNoteColorChange={notes.setColor}
          onNoteToolChange={(active) => {
            setNoteTool(active);
            if (active) links.setArmed(false);
          }}
          onNotesVisibleChange={setNotesVisible}
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
});
