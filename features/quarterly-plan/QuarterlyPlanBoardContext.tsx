'use client';

import type { MemberAbsence, QuarterRowGoalFlag, QuarterRowLevel } from './quarterlyPlanBoardModel';
import type { QuarterDetailLevel } from './quarterlyPlanDetail';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { QuarterlyPlanDraftDiff } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';
import type { QuarterlyPlanDraftItem } from '@/lib/quarterlyPlans/quarterlyPlanDraftItems';
import type { DaySpan, NoteLaneBlocker, WeekSpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type { QuarterRowPlace } from '@/lib/quarterlyPlans/quarterlyPlanRows';
import type {
  QuarterlyPlan,
  QuarterlyPlanAssignment,
  QuarterlyPlanEpic,
  QuarterlyPlanLink,
  QuarterlyPlanNote,
  QuarterlyPlanNoteRow,
  QuarterlyPlanPhase,
  QuarterlyPlanSprint,
  QuarterlyPlanTrackerEpic,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { Developer } from '@/types';

import { createContext, useContext } from 'react';

import { assignNoteLanes, quarterNoteRowKey } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { QUARTER_LANE_HEIGHT_PX } from './quarterlyPlanBoardModel';

export interface QuarterMenuAnchor {
  x: number;
  y: number;
}

/**
 * Строка, в которой сейчас открыто поле ввода: новая строка или переименование. `afterId` — строка,
 * под которую встанет новая (QO1); `parentEpicId` — новая строка будет задачей этого эпика (QT1).
 */
export type QuarterlyPlanDraft =
  | { afterId?: string; directionId: string; kind: 'newEpic'; parentEpicId?: string }
  | { afterId?: string; kind: 'newDirection'; teamId: string }
  | { id: string; kind: 'renameDirection' | 'renameEpic' };

/** Строка, в которой стоят полосы назначений: эпик или направление (QG2). */
export interface QuarterlyPlanAssignRow {
  id: string;
  kind: 'direction' | 'epic';
}

export interface QuarterlyPlanRowTarget {
  id: string;
  /** `addEpic` и `addTask` — меню «+» в строке направления и эпика: новая строка или строка из трекера. */
  kind: 'addEpic' | 'addTask' | 'direction' | 'epic';
}

/**
 * Жест над заметкой, который должны видеть другие строки и раскладка.
 * `move` — заметку несут: `note` стоит на неделе под курсором, `row` — строка под курсором.
 * `resize` — заметку растягивают: `note` уже с новым сроком и высотой, строка перекладывается сразу.
 */
export interface QuarterlyPlanNoteDrag {
  mode: 'move' | 'resize';
  note: QuarterlyPlanNote;
  row: QuarterlyPlanNoteRow;
}

/** Пункты показанного черновика агента, которые решают на доске по одному (QM10). */
export interface QuarterlyPlanDraftReview {
  brand: McpOAuthClientBrand | null;
  /** Пункт по id его сущности. */
  items: ReadonlyMap<string, QuarterlyPlanDraftItem>;
  /** Пункты-связи по полосе, к которой связь ведёт: на линии ✓/✗ не поставить, они — у полосы. */
  linkItemsByAssignment: ReadonlyMap<string, readonly QuarterlyPlanDraftItem[]>;
  /** Решение уходит сразу; пока прошлое не дошло, новое не принимается. */
  onApprove: (itemId: string) => void;
  onReject: (itemId: string) => void;
}

export interface QuarterlyPlanBoardContextValue {
  absenceByMember: ReadonlyMap<string, MemberAbsence>;
  /** Свои полосы направлений (QG2). */
  assignmentsByDirection: ReadonlyMap<string, QuarterlyPlanAssignment[]>;
  assignmentsByEpic: ReadonlyMap<string, QuarterlyPlanAssignment[]>;
  /** Полосы эпика вместе с полосами его задач (QT3); у задачи — только свои. */
  assignmentsByEpicTree: ReadonlyMap<string, QuarterlyPlanAssignment[]>;
  /** Открыто меню назначения: строка, недели и фаза будущей полосы — строка рисует её превью. */
  assignPreview: {
    /** Меню уже закрыто: превью уходит. */
    closing: boolean;
    phase: QuarterlyPlanPhase;
    row: QuarterlyPlanAssignRow;
    startWeek: number;
    weeks: number;
  } | null;

  /** Индекс текущей недели; -1, если «сегодня» вне квартала. */
  currentWeek: number;
  dayCount: number;
  /** Полоса, к которой перешли по счётчику пересечений; `nonce` меняется при каждом переходе. */
  /** Уровень детализации доски: роадмэп, план или по дням (QZ1). */
  detail: QuarterDetailLevel;
  draft: QuarterlyPlanDraft | null;
  /** Черновик агента показан: что в нём новое, изменено и убрано (QM9); null — черновика на доске нет. */
  draftMarks: QuarterlyPlanDraftDiff | null;
  /** ✓/✗ пунктов показанного черновика на доске (QM10); null — черновика на доске нет. */
  draftReview: QuarterlyPlanDraftReview | null;
  /** Эпики с раскрытым списком задач (QT4). */
  expandedEpicIds: ReadonlySet<string>;
  focusedIssue: { assignmentId: string; nonce: number } | null;
  /** Флажки целей спринтов по id строки плана — эпика или направления (QG8). */
  goalsByRow: ReadonlyMap<string, QuarterRowGoalFlag[]>;
  /** Включено «Скрыть готовые»: готовые задачи эпиков тоже не показываются (QB7). */
  hideDone: boolean;
  /** Сколько назначений с пересечениями у команды. */
  issueCountByTeam: ReadonlyMap<string, number>;
  /** Инструмент «Связь»: включён ли и какая полоса выбрана источником. */
  linking: { armed: boolean; sourceId: string | null };
  memberById: ReadonlyMap<string, Developer>;
  /** Цвет, которым инструмент «Заметка» поставит следующую заметку. */
  noteColor: StickyNoteColor;
  /** Идущий жест над заметкой; null — жеста нет или заметку несут мимо строк. */
  noteDrag: QuarterlyPlanNoteDrag | null;
  /** Действия правки заметки: из листа на доске и из режима фокуса. */
  noteEditActions: {
    cancel: () => void;
    color: (color: StickyNoteColor) => void;
    /** Развернуть в режим фокуса; `value` — текст, набранный в листе. */
    expand: (value: string) => void;
    /** Подтвердить правку; пустой текст не сохраняется. */
    submit: (value: string) => void;
  };
  /**
   * Заметка в правке. `expanded` — развёрнута в режим фокуса, лист на доске скрыт; иначе правится
   * прямо в листе. `value` — текст, с которого редактор начинает.
   */
  noteEditing: { color: StickyNoteColor; expanded: boolean; noteId: string; value: string } | null;
  /** Заметки по ключу строки (`quarterNoteRowKey`). */
  notesByRow: ReadonlyMap<string, QuarterlyPlanNote[]>;
  /** Включён инструмент «Заметка»: клик по неделе любой строки ставит заметку. */
  noteTool: boolean;
  /** Назначения, исполнитель которых больше не в команде эпика (QI6). */
  notInTeamAssignmentIds: ReadonlySet<string>;
  /** Связи, которые доска рисует: связи назначений, а на роадмэпе — связи сводных полос (QL7). */
  shownLinks: ReadonlyArray<QuarterlyPlanLink & { linkIds?: readonly string[] }>;
  /** Карточки привязанных задач на досках спринтов, по ключу трекера (QK8). */
  sprintCards: QuarterlyPlan['sprintCards'];
  /** Задачи эпиков по эпику-родителю, в порядке плана (QT1). */
  tasksByEpic: ReadonlyMap<string, QuarterlyPlanEpic[]>;
  timelineStart: Date;
  /** Привязанные эпики трекера по ключу: название, статус, «сделано» (QE5, QE7). */
  trackerEpics: Readonly<Record<string, QuarterlyPlanTrackerEpic>>;
  /** Направления «проработано, не разбито» (QG4). */
  unsplitDirectionIds: ReadonlySet<string>;
  /** Для зависимого назначения — те, кого оно ждёт и кто ещё не закончит к его началу. */
  violatedBlockers: ReadonlyMap<string, QuarterlyPlanAssignment[]>;
  weeks: readonly QuarterWeek[];
  /** Полосу можно сделать целью связи от выбранного источника. */
  canLinkTo: (assignmentId: string) => boolean;
  /** Полосу сдвинули или растянули: срок неделями, у полосы задачи — ещё и днями (QT5). */
  onBarChange: (assignmentId: string, span: Partial<DaySpan> & WeekSpan) => void;
  onBarClick: (assignmentId: string, anchor: QuarterMenuAnchor) => void;
  /** Клик по свободной клетке строки; `span` — свободные дни этой недели, на них встанет новая полоса. */
  onCellClick: (row: QuarterlyPlanAssignRow, week: number, anchor: QuarterMenuAnchor, span: DaySpan) => void;
  /** Завершить ввод в открытом поле: название или null, если ввод отменён. */
  onDraftSubmit: (title: string | null) => void;
  /** Клик по полосе с включённым инструментом «Связь»: источник, цель или снятие выбора. */
  onLinkBarClick: (assignmentId: string) => void;
  onLinkDelete: (linkId: string) => void;
  /** Кликнули мимо полос — выбор источника снимается. */
  onLinkSourceClear: () => void;
  /** Заметку сдвинули, растянули или перенесли в другую строку. */
  onNoteChange: (
    noteId: string,
    patch: Partial<Pick<QuarterlyPlanNote, 'row' | 'rows' | 'startWeek' | 'weeks'>>
  ) => void;
  onNoteClick: (noteId: string, anchor: QuarterMenuAnchor) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteDrag: (drag: QuarterlyPlanNoteDrag | null) => void;
  onNotePlace: (row: QuarterlyPlanNoteRow, week: number, anchor: QuarterMenuAnchor) => void;
  onRowMenu: (target: QuarterlyPlanRowTarget, anchor: QuarterMenuAnchor) => void;
  /** Строку перетащили: она встаёт перед строкой `anchorId` того же уровня или после неё (QO2, QO3). */
  onRowMove: (level: QuarterRowLevel, id: string, anchorId: string, place: QuarterRowPlace) => void;
  /** Клик по пунктиру расхождения задачи (QK8): поповер с синхронизацией этой задачи (QK9). */
  onSprintDriftClick: (epicId: string, anchor: QuarterMenuAnchor) => void;
  /** Клик по спринту в строке команды: цели спринта в сайдбаре (QG13). */
  onSprintGoalsOpen: (sprint: QuarterlyPlanSprint, boardId: number) => void;
  onStartDraft: (draft: QuarterlyPlanDraft) => void;
  onStatusClick: (epicId: string, anchor: QuarterMenuAnchor) => void;
  onToggleEpic: (epicId: string) => void;
  /** Сменить статус привязанной строки: переход её задачи в трекере (QE7). */
  onTrackerStatusChange: (
    issueKey: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string
  ) => void;
  /** Другие назначения того же человека, с которыми это может стоять параллельно: без полос той же работы (QT3). */
  rivalAssignmentsOf: (assignment: QuarterlyPlanAssignment) => QuarterlyPlanAssignment[];
  /** Название строки назначения — эпика или направления; для подсказок полос. */
  rowTitleOf: (assignment: Pick<QuarterlyPlanAssignment, 'directionId' | 'epicId'>) => string;
}

const QuarterlyPlanBoardContext = createContext<QuarterlyPlanBoardContextValue | null>(null);

export const QuarterlyPlanBoardProvider = QuarterlyPlanBoardContext.Provider;

/** Недели, с которых начинаются спринты команды: по ним строки команды рисуют вертикальные границы спринтов. */
const QuarterSprintStartWeeksContext = createContext<readonly number[]>([]);

export const QuarterSprintStartWeeksProvider = QuarterSprintStartWeeksContext.Provider;

export function useQuarterSprintStartWeeks(): readonly number[] {
  return useContext(QuarterSprintStartWeeksContext);
}

/**
 * Высота дорожки строки: по ней встают полосы, плашки и заметки этой строки. У строк разных уровней она
 * разная (`QUARTER_LANE_HEIGHT_BY_LEVEL`); строка задаёт её своему содержимому.
 */
const QuarterLaneHeightContext = createContext<number>(QUARTER_LANE_HEIGHT_PX);

export const QuarterLaneHeightProvider = QuarterLaneHeightContext.Provider;

export function useQuarterLaneHeight(): number {
  return useContext(QuarterLaneHeightContext);
}

/**
 * Сдвиг полос строки вниз, px: верхние дорожки строки занимают цели спринтов (QG8), полосы встают под ними.
 * В строке без целей — 0.
 */
const QuarterBarsTopContext = createContext<number>(0);

export const QuarterBarsTopProvider = QuarterBarsTopContext.Provider;

export function useQuarterBarsTop(): number {
  return useContext(QuarterBarsTopContext);
}

export function useQuarterlyPlanBoard(): QuarterlyPlanBoardContextValue {
  const value = useContext(QuarterlyPlanBoardContext);
  if (!value) {
    throw new Error('useQuarterlyPlanBoard must be used inside QuarterlyPlanBoardProvider');
  }
  return value;
}

/**
 * Заметки строки и их дорожки. Дорожки общие с `blockers` (полосами, плашками): заметка встаёт
 * рядом с ними и уходит ниже, только если недели заняты. Пока заметку растягивают, раскладка
 * считается уже по её новому размеру. `laneCount` — сколько дорожек занимают заметки от верха.
 */
export function useQuarterRowNotes(
  row: QuarterlyPlanNoteRow | undefined,
  blockers?: readonly NoteLaneBlocker[]
) {
  const { noteDrag, notesByRow } = useQuarterlyPlanBoard();
  const notes = (row && notesByRow.get(quarterNoteRowKey(row))) ?? [];
  const resized = noteDrag?.mode === 'resize' ? noteDrag.note : null;
  const laidOut = resized ? notes.map((note) => (note.id === resized.id ? resized : note)) : notes;
  const { laneById } = assignNoteLanes(laidOut, blockers);
  const laneCount = Math.max(0, ...laidOut.map((note) => (laneById.get(note.id) ?? 0) + note.rows));
  return { laneById, laneCount, notes };
}
