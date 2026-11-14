import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Developer } from '@/types';

export type QuarterNumber = 1 | 2 | 3 | 4;

export interface QuarterRef {
  quarter: QuarterNumber;
  year: number;
}

export type QuarterlyPlanEpicStatus = 'backlog' | 'blocked' | 'done' | 'in_progress' | 'test';

export interface QuarterlyPlanSprint {
  endDate: string;
  id: number;
  name: string;
  startDate: string;
}

/** Команда на квартальной доске: доска трекера, её люди и спринты, попавшие в квартал. */
export interface QuarterlyPlanTeam {
  boardId: number;
  id: string;
  members: Developer[];
  sprints: QuarterlyPlanSprint[];
  title: string;
}

/** Направление — веха квартала; живёт только в плане и объединяет эпики команды. */
export interface QuarterlyPlanDirection {
  id: string;
  teamId: string;
  title: string;
}

/** Эпик в рамках направления; может быть привязан к эпику трекера по ключу. */
export interface QuarterlyPlanEpic {
  directionId: string;
  id: string;
  issueKey?: string;
  status: QuarterlyPlanEpicStatus;
  title: string;
}

/** Человек занят эпиком `weeks` недель подряд, начиная с недели `startWeek` квартала. */
export interface QuarterlyPlanAssignment {
  epicId: string;
  id: string;
  memberId: string;
  startWeek: number;
  weeks: number;
}

/**
 * Строка доски, к которой привязана заметка: команда (её шапка), отпуска команды,
 * направление или эпик. Для `team` и `absence` в `id` лежит идентификатор команды.
 */
export interface QuarterlyPlanNoteRow {
  id: string;
  kind: 'absence' | 'direction' | 'epic' | 'team';
}

/**
 * Заметка на доске: стоит в строке `row`, занимает `weeks` недель с недели `startWeek`
 * и `rows` дорожек по высоте.
 * Привязка к сущности, а не к месту на экране: по ней заметку читают люди и агенты.
 */
export interface QuarterlyPlanNote {
  color: StickyNoteColor;
  id: string;
  row: QuarterlyPlanNoteRow;
  /** Высота в дорожках строки, от 1 до `QUARTER_NOTE_MAX_ROWS`. */
  rows: number;
  startWeek: number;
  text: string;
  weeks: number;
}

/**
 * Блокирующая зависимость между назначениями: `toId` начинают строго после того, как закончат `fromId`.
 */
export interface QuarterlyPlanLink {
  /** Назначение, которое должно закончиться раньше. */
  fromId: string;
  id: string;
  /** Назначение, которое ждёт. */
  toId: string;
}

/** То, что редактируется на доске и сохраняется целиком. */
export interface QuarterlyPlanContent {
  assignments: QuarterlyPlanAssignment[];
  directions: QuarterlyPlanDirection[];
  epics: QuarterlyPlanEpic[];
  links: QuarterlyPlanLink[];
  notes: QuarterlyPlanNote[];
}

export interface QuarterlyPlan extends QuarterlyPlanContent, QuarterRef {
  teams: QuarterlyPlanTeam[];
}
