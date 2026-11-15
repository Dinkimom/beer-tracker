'use client';

import type { MemberAbsence } from './quarterlyPlanBoardModel';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';
import type { QuarterlyPlanDraftDiff } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';
import type { QuarterlyPlanDraftItem } from '@/lib/quarterlyPlans/quarterlyPlanDraftItems';
import type { NoteLaneBlocker, WeekSpan } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import type {
  QuarterlyPlanAssignment,
  QuarterlyPlanNote,
  QuarterlyPlanNoteRow,
  QuarterlyPlanTrackerEpic,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { Developer } from '@/types';

import { createContext, useContext } from 'react';

import { assignNoteLanes, quarterNoteRowKey } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

export interface QuarterMenuAnchor {
  x: number;
  y: number;
}

/** Строка, в которой сейчас открыто поле ввода: новый эпик, новое направление или переименование. */
export type QuarterlyPlanDraft =
  | { directionId: string; kind: 'newEpic' }
  | { id: string; kind: 'renameDirection' | 'renameEpic' }
  | { kind: 'newDirection'; teamId: string };

/** Строка, в которой стоят полосы назначений: эпик или направление (QG2). */
export interface QuarterlyPlanAssignRow {
  id: string;
  kind: 'direction' | 'epic';
}

export interface QuarterlyPlanRowTarget {
  id: string;
  /** `addEpic` — меню «+» в строке: новая строка или строка из трекера. */
  kind: 'addEpic' | 'direction' | 'epic';
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
  assignmentsByMember: ReadonlyMap<string, QuarterlyPlanAssignment[]>;
  /** Индекс текущей недели; -1, если «сегодня» вне квартала. */
  currentWeek: number;
  dayCount: number;
  draft: QuarterlyPlanDraft | null;
  /** Черновик агента показан: что в нём новое, изменено и убрано (QM9); null — черновика на доске нет. */
  draftMarks: QuarterlyPlanDraftDiff | null;
  /** ✓/✗ пунктов показанного черновика на доске (QM10); null — черновика на доске нет. */
  draftReview: QuarterlyPlanDraftReview | null;
  /** Полоса, к которой перешли по счётчику пересечений; `nonce` меняется при каждом переходе. */
  focusedIssue: { assignmentId: string; nonce: number } | null;
  /** Сколько назначений с пересечениями у команды. */
  issueCountByTeam: ReadonlyMap<string, number>;
  /** Инструмент «Связь»: включён ли и какая полоса выбрана источником. */
  linking: { armed: boolean; sourceId: string | null };
  memberById: ReadonlyMap<string, Developer>;
  memberToneById: ReadonlyMap<string, string>;
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
  onBarChange: (assignmentId: string, span: WeekSpan) => void;
  onBarClick: (assignmentId: string, anchor: QuarterMenuAnchor) => void;
  onCellClick: (row: QuarterlyPlanAssignRow, week: number, anchor: QuarterMenuAnchor) => void;
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
  onStartDraft: (draft: QuarterlyPlanDraft) => void;
  onStatusClick: (epicId: string, anchor: QuarterMenuAnchor) => void;
  /** Название строки назначения — эпика или направления; для подсказок полос. */
  rowTitleOf: (assignment: Pick<QuarterlyPlanAssignment, 'directionId' | 'epicId'>) => string;
}

const QuarterlyPlanBoardContext = createContext<QuarterlyPlanBoardContextValue | null>(null);

export const QuarterlyPlanBoardProvider = QuarterlyPlanBoardContext.Provider;

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
