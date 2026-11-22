/**
 * Меню у точки клика на доске квартала: полоса, клетка недели (назначение), строка, статус, расхождение
 * со спринтом. Закрытое меню и превью полосы ещё `CLOSE_ANIMATION_MS` на экране — уходят с анимацией.
 */

import type { QuarterlyPlanAssignRow, QuarterlyPlanRowTarget, QuarterMenuAnchor } from '../QuarterlyPlanBoardContext';
import type { QuarterlyPlanMenuState } from '../quarterlyPlanMenuSections';
import type { DaySpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterlyPlanAssignment, QuarterlyPlanPhase } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { action, computed, makeObservable, observable } from 'mobx';

import { assignmentPhase, daySpanOf } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

/** Длительность ухода поповера (`overlay-float-exit`) и превью полосы. */
const CLOSE_ANIMATION_MS = 200;

/** Будущая полоса из открытого меню назначения: строка рисует её превью. */
interface QuarterAssignPreview {
  /** Меню уже закрыто: превью уходит. */
  closing: boolean;
  phase: QuarterlyPlanPhase;
  row: QuarterlyPlanAssignRow;
  /** Недели с дробью — те дни, куда встанет полоса, как дорожки полос. */
  startWeek: number;
  weeks: number;
}

export class QuarterBoardMenu {
  /** Открытое меню; null — закрыто. */
  current: QuarterlyPlanMenuState | null = null;
  /** Что рисовать: открытое меню или только что закрытое, пока оно уходит. */
  shown: QuarterlyPlanMenuState | null = null;
  /**
   * Пункт меню выбран — превью полосы убираем сразу: на его месте уже настоящая полоса, а гаснущее превью
   * перескочило бы в соседнюю дорожку и раздвинуло строку. Закрыли мимо — превью гаснет вместе с меню.
   */
  private previewCut = false;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeObservable<this, 'clearShown' | 'previewCut' | 'show'>(this, {
      assignMore: action.bound,
      assignPreview: computed,
      clearShown: action,
      close: action.bound,
      current: observable.ref,
      openAssign: action.bound,
      openBar: action.bound,
      openRow: action.bound,
      openSprintDrift: action.bound,
      openStatus: action.bound,
      previewCut: observable,
      setAssignPhase: action.bound,
      show: action,
      shown: observable.ref,
    });
  }

  get assignPreview(): QuarterAssignPreview | null {
    const menu = this.shown;
    if (menu?.kind !== 'assign' || this.previewCut) return null;
    const perWeek = QUARTER_WORKING_DAYS_PER_WEEK;
    return {
      closing: this.current === null,
      phase: menu.phase ?? (menu.row.kind === 'direction' ? 'discovery' : 'delivery'),
      row: menu.row,
      startWeek: (menu.startDay ?? menu.week * perWeek) / perWeek,
      weeks: (menu.days ?? menu.weeks * perWeek) / perWeek,
    };
  }

  openBar(assignmentId: string, anchor: QuarterMenuAnchor): void {
    this.show({ anchor, assignmentId, kind: 'bar' });
  }

  /** Клик по свободной клетке строки; `span` — свободные дни этой недели, на них встанет новая полоса. */
  openAssign(row: QuarterlyPlanAssignRow, week: number, anchor: QuarterMenuAnchor, span: DaySpan): void {
    this.show({ anchor, kind: 'assign', row, week, weeks: 1, ...span });
  }

  openRow(target: QuarterlyPlanRowTarget, anchor: QuarterMenuAnchor): void {
    this.show({ anchor, kind: 'row', target });
  }

  openStatus(epicId: string, anchor: QuarterMenuAnchor): void {
    this.show({ anchor, epicId, kind: 'status' });
  }

  openSprintDrift(epicId: string, anchor: QuarterMenuAnchor): void {
    this.show({ anchor, epicId, kind: 'sprintDrift' });
  }

  /** Ещё один человек на те же дни, строку и фазу, что у полосы: меню на том же месте становится выбором. */
  assignMore(assignment: QuarterlyPlanAssignment): void {
    if (!this.current) return;
    this.show({
      anchor: this.current.anchor,
      kind: 'assign',
      phase: assignmentPhase(assignment),
      row: assignment.epicId ? { id: assignment.epicId, kind: 'epic' } : { id: assignment.directionId ?? '', kind: 'direction' },
      week: assignment.startWeek,
      weeks: assignment.weeks,
      ...daySpanOf(assignment),
    });
  }

  /** Фаза новой полосы выбрана: меню остаётся открытым, выбор человека — следом. */
  setAssignPhase(phase: QuarterlyPlanPhase): void {
    if (this.current?.kind === 'assign') this.show({ ...this.current, phase });
  }

  /** `select` — выбран пункт: превью полосы уходит сразу, меню гаснет. */
  close(reason?: 'select'): void {
    if (!this.current) return;
    this.current = null;
    this.previewCut = reason === 'select';
    this.closeTimer = setTimeout(() => this.clearShown(), CLOSE_ANIMATION_MS);
  }

  private show(menu: QuarterlyPlanMenuState): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = null;
    this.previewCut = false;
    this.current = menu;
    this.shown = menu;
  }

  private clearShown(): void {
    this.closeTimer = null;
    this.shown = null;
  }
}
