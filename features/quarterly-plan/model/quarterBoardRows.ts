/**
 * Строки доски квартала глазами одного человека: что свёрнуто, какие эпики раскрыты, где открыто поле
 * ввода и к какой проблеме перешли. В план это не пишется — только вид этой вкладки.
 */

import type { QuarterlyPlanDraft } from '../QuarterlyPlanBoardContext';
import type { QuarterDetailLevel } from '../quarterlyPlanDetail';
import type { QuarterlyPlanIssue } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import type { QuarterlyPlan, QuarterlyPlanContent, QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { action, makeObservable, observable } from 'mobx';

import { addDirection, addEpic, updateDirection, updateEpic } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

function toggled(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(ids);
  if (!next.delete(id)) next.add(id);
  return next;
}

export class QuarterBoardRows {
  /** Свёрнутые команды и направления: идентификаторы у них не пересекаются. */
  collapsedIds: ReadonlySet<string> = new Set();
  /** Строка, в которой открыто поле ввода: новая строка или переименование. */
  draft: QuarterlyPlanDraft | null = null;
  /** Эпики с раскрытым списком задач: по умолчанию задачи свёрнуты, доска остаётся компактной (QT4). */
  expandedEpicIds: ReadonlySet<string> = new Set();
  /** Полоса, к которой перешли по счётчику проблем; `nonce` меняется при каждом переходе — полоса мигает снова. */
  focusedIssue: { assignmentId: string; nonce: number } | null = null;

  constructor() {
    makeObservable(this, {
      collapsedIds: observable.ref,
      draft: observable.ref,
      expandedEpicIds: observable.ref,
      expandEpic: action.bound,
      focusedIssue: observable.ref,
      focusNextIssue: action.bound,
      showDetail: action.bound,
      startDraft: action.bound,
      takeDraft: action.bound,
      toggleCollapsed: action.bound,
      toggleEpic: action.bound,
    });
  }

  toggleCollapsed(id: string): void {
    this.collapsedIds = toggled(this.collapsedIds, id);
  }

  toggleEpic(id: string): void {
    this.expandedEpicIds = toggled(this.expandedEpicIds, id);
  }

  expandEpic(id: string | undefined): void {
    if (id && !this.expandedEpicIds.has(id)) this.expandedEpicIds = new Set(this.expandedEpicIds).add(id);
  }

  /** «Дни» раскрывают задачи всех эпиков, другие уровни сворачивают: стрелки эпиков работают на обоих (QZ1). */
  showDetail(level: QuarterDetailLevel, epics: readonly Pick<QuarterlyPlanEpic, 'parentEpicId'>[]): void {
    this.expandedEpicIds = new Set(level === 'days' ? epics.flatMap((epic) => (epic.parentEpicId ? [epic.parentEpicId] : [])) : []);
  }

  /** Поле новой задачи открывается в раскрытом эпике и оставляет его раскрытым. */
  startDraft(draft: QuarterlyPlanDraft): void {
    if (draft.kind === 'newEpic') this.expandEpic(draft.parentEpicId);
    this.draft = draft;
  }

  /** Поле ввода закрыто: его строка для записи в план, поле больше не открыто. */
  takeDraft(): QuarterlyPlanDraft | null {
    const { draft } = this;
    this.draft = null;
    return draft;
  }

  /** Следующая проблема по порядку доски; свёрнутые команда и направление и эпик задачи раскрываются. */
  focusNextIssue(issues: readonly QuarterlyPlanIssue[], plan: Pick<QuarterlyPlan, 'assignments' | 'epics'>): void {
    const index = issues.findIndex((issue) => issue.assignmentId === this.focusedIssue?.assignmentId);
    const next = issues[(index + 1) % issues.length];
    if (!next) return;
    const epicId = plan.assignments.find((assignment) => assignment.id === next.assignmentId)?.epicId;
    this.expandEpic(plan.epics.find((epic) => epic.id === epicId)?.parentEpicId);
    const collapsed = new Set(this.collapsedIds);
    collapsed.delete(next.teamId);
    collapsed.delete(next.directionId);
    this.collapsedIds = collapsed;
    this.focusedIssue = { assignmentId: next.assignmentId, nonce: (this.focusedIssue?.nonce ?? 0) + 1 };
  }
}

/** Название из поля ввода — в план: новое направление, эпик или задача либо новое название строки. */
export function applyDraftTitle(
  content: QuarterlyPlanContent,
  draft: QuarterlyPlanDraft,
  title: string,
  newId: string
): QuarterlyPlanContent {
  if (draft.kind === 'newDirection') {
    return addDirection(content, { id: newId, teamId: draft.teamId, title }, draft.afterId);
  }
  if (draft.kind === 'newEpic') {
    const { afterId, directionId, parentEpicId } = draft;
    return addEpic(content, { directionId, id: newId, ...(parentEpicId ? { parentEpicId } : {}), status: 'backlog', title }, afterId);
  }
  return draft.kind === 'renameDirection'
    ? updateDirection(content, draft.id, { title })
    : updateEpic(content, draft.id, { title });
}
