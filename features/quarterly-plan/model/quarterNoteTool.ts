/**
 * Заметки доски квартала — сценарий доски спринта. Инструмент «Заметка»: клик по неделе ставит лист-черновик
 * и открывает правку прямо в нём; клик по готовой заметке — то же. Из листа правку можно развернуть в режим
 * фокуса и вернуть обратно. Цвет новой заметки — выбранный у инструмента. Инструмент отпускается после
 * одной заметки.
 */

import type { QuarterlyPlanNoteDrag } from '../QuarterlyPlanBoardContext';
import type { QuarterEditPort } from './quarterLinkTool';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { QuarterlyPlanNote, QuarterlyPlanNoteRow } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { action, computed, makeObservable, observable } from 'mobx';

import { DEFAULT_STICKY_NOTE_COLOR } from '@/lib/comments/stickyNoteColor';
import { addNote, removeNote, updateNote } from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { randomUuid } from '@/lib/randomUuid';

import { QUARTER_NEW_NOTE_ROWS, QUARTER_NEW_NOTE_WEEKS } from '../quarterlyPlanBoardModel';

/**
 * Заметка в редакторе. Новая (`draft`) ещё не в плане: её лист стоит на доске черновиком, пока текст
 * не подтвердят. `expanded` — развёрнута в режим фокуса, лист на доске скрыт; иначе правится прямо в листе.
 * `value` — текст, с которого начинает редактор листа; набор в листе живёт в самом листе.
 */
interface NoteEditingState {
  color: StickyNoteColor;
  draft: QuarterlyPlanNote | null;
  expanded: boolean;
  noteId: string;
  value: string;
}

type NotePatch = Partial<Pick<QuarterlyPlanNote, 'row' | 'rows' | 'startWeek' | 'weeks'>>;

function sameDrag(a: QuarterlyPlanNoteDrag | null, b: QuarterlyPlanNoteDrag | null): boolean {
  return (
    a?.mode === b?.mode &&
    a?.row.id === b?.row.id &&
    a?.row.kind === b?.row.kind &&
    a?.note.startWeek === b?.note.startWeek &&
    a?.note.weeks === b?.note.weeks &&
    a?.note.rows === b?.note.rows
  );
}

export class QuarterNoteTool {
  /** Включён инструмент «Заметка»: клик по неделе любой строки ставит заметку. */
  active = false;
  /** Цвет, которым инструмент поставит следующую заметку. */
  color: StickyNoteColor = DEFAULT_STICKY_NOTE_COLOR;
  /** Идущий жест над заметкой; null — жеста нет или заметку несут мимо строк. */
  drag: QuarterlyPlanNoteDrag | null = null;
  /** Текст в режиме фокуса: набор перерисовывает только редактор, не доску. */
  focusValue = '';
  private state: NoteEditingState | null = null;

  constructor(private readonly port: () => QuarterEditPort) {
    makeObservable<this, 'state'>(this, {
      active: observable,
      cancel: action.bound,
      change: action.bound,
      collapse: action.bound,
      color: observable,
      drag: observable.ref,
      draftNote: computed,
      editing: computed.struct,
      expand: action.bound,
      focusValue: observable,
      open: action.bound,
      place: action.bound,
      remove: action.bound,
      setActive: action.bound,
      setColor: action.bound,
      setDrag: action.bound,
      setFocusValue: action.bound,
      state: observable.ref,
      submit: action.bound,
    });
  }

  /** Заметка в правке без черновика: что видят лист и строка. */
  get editing(): { color: StickyNoteColor; expanded: boolean; noteId: string; value: string } | null {
    const { state } = this;
    return state ? { color: state.color, expanded: state.expanded, noteId: state.noteId, value: state.value } : null;
  }

  /** Новый лист, ещё не попавший в план: строка рисует его среди своих заметок. */
  get draftNote(): QuarterlyPlanNote | null {
    return this.state?.draft ?? null;
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  /** Цвет инструмента и открытой заметки. */
  setColor(color: StickyNoteColor): void {
    this.color = color;
    if (this.state) this.state = { ...this.state, color };
  }

  /** Клик по неделе с инструментом: лист-черновик длиной до конца квартала, правка в нём; инструмент отпускается. */
  place(row: QuarterlyPlanNoteRow, startWeek: number): void {
    const weekCount = this.port().view?.weeks.length ?? startWeek + QUARTER_NEW_NOTE_WEEKS;
    const note: QuarterlyPlanNote = {
      color: this.color,
      id: randomUuid(),
      row,
      rows: QUARTER_NEW_NOTE_ROWS,
      startWeek,
      text: '',
      weeks: Math.min(QUARTER_NEW_NOTE_WEEKS, weekCount - startWeek),
    };
    this.active = false;
    this.state = { color: this.color, draft: note, expanded: false, noteId: note.id, value: '' };
  }

  /** Клик по готовой заметке — правка в её листе. */
  open(noteId: string): void {
    const note = this.port().view?.plan.notes.find((item) => item.id === noteId);
    if (note) this.state = { color: note.color, draft: null, expanded: false, noteId, value: note.text };
  }

  cancel(): void {
    this.state = null;
  }

  /** Развернуть в режим фокуса; `value` — текст, набранный в листе. */
  expand(value: string): void {
    if (!this.state) return;
    this.focusValue = value;
    this.state = { ...this.state, expanded: true, value };
  }

  /** «Вернуть на доску»: правка продолжается в листе с набранным текстом. */
  collapse(): void {
    if (this.state) this.state = { ...this.state, expanded: false, value: this.focusValue };
  }

  setFocusValue(value: string): void {
    this.focusValue = value;
  }

  /** Черновик попадает в план, готовая заметка получает текст и цвет; пустой текст не сохраняется. */
  submit(value: string): void {
    const { state } = this;
    if (!state) return;
    this.state = null;
    const text = value.trim();
    if (!text) return;
    const { color, draft, noteId } = state;
    this.port().applyEdit((content) =>
      draft ? addNote(content, { ...draft, color, text }) : updateNote(content, noteId, { color, text })
    );
  }

  /** Заметку сдвинули, растянули или перенесли в другую строку. */
  change(noteId: string, patch: NotePatch): void {
    this.port().applyEdit((content) => updateNote(content, noteId, patch));
  }

  remove(noteId: string): void {
    this.port().applyEdit((content) => removeNote(content, noteId));
  }

  /** Жест обновляется только при смене строки, недели или размера, а не на каждый пиксель. */
  setDrag(next: QuarterlyPlanNoteDrag | null): void {
    if (!sameDrag(this.drag, next)) this.drag = next;
  }
}
