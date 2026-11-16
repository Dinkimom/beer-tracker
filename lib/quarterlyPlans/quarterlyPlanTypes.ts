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

/** Направление — веха квартала, объединяет эпики команды; может быть привязано к эпику трекера по ключу. */
export interface QuarterlyPlanDirection {
  id: string;
  issueKey?: string;
  teamId: string;
  title: string;
}

/**
 * Эпик плана в рамках направления; может быть привязан к задаче трекера (любого типа) по ключу.
 * С `parentEpicId` это задача эпика (QT1): такая же строка со своими полосами, уровнем ниже.
 */
export interface QuarterlyPlanEpic {
  directionId: string;
  id: string;
  issueKey?: string;
  /** Эпик-родитель задачи; у эпика поля нет. Задача стоит в направлении родителя (QT2). */
  parentEpicId?: string;
  status: QuarterlyPlanEpicStatus;
  title: string;
}

/** Фаза работы; совпадает с типом цели спринта (QG1). */
export type QuarterlyPlanPhase = 'delivery' | 'discovery';

/**
 * Человек занят строкой плана `weeks` недель подряд, начиная с недели `startWeek` квартала.
 * Строка — эпик (`epicId`) или направление (`directionId`): задано ровно одно (QG2).
 */
export interface QuarterlyPlanAssignment {
  /**
   * Длина в рабочих днях (QT5) — у полосы, которая стоит не целыми неделями; вместе со `startDay`.
   * `startWeek` и `weeks` тогда — недели, которые эти дни задевают.
   */
  days?: number;
  directionId?: string;
  epicId?: string;
  id: string;
  memberId: string;
  /** Нет фазы — delivery (QG1). */
  phase?: QuarterlyPlanPhase;
  /** Первый рабочий день полосы от начала квартала (понедельник первой недели — 0). */
  startDay?: number;
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

/**
 * Эпик трекера, к которому привязана строка плана: название и статус оттуда (QE5, QE7).
 * В плане не хранится — сервер собирает при чтении.
 */
export interface QuarterlyPlanTrackerEpic {
  /** «Сделано» по канону C1. */
  done: boolean;
  /** Ключ палитры карточек планера для статуса (с настройками организации). */
  statusColorKey?: string;
  /** Название статуса, как его показывает трекер. */
  statusDisplay: string;
  title: string;
}

/**
 * Где задача трекера стоит на доске спринта: первый и последний рабочий день карточки (QK8).
 * В плане не хранится — сервер собирает при чтении.
 */
export interface QuarterlyPlanSprintCard {
  endDate: string;
  sprintId: number;
  sprintName: string;
  startDate: string;
}

export interface QuarterlyPlan extends QuarterlyPlanContent, QuarterRef {
  /** Карточки привязанных задач эпиков на досках спринтов квартала, по ключу трекера; задачи нет на доске — ключа нет. */
  sprintCards: Record<string, QuarterlyPlanSprintCard>;
  teams: QuarterlyPlanTeam[];
  /** Привязанные эпики трекера по ключу; эпика нет — трекер его не отдал (нет доступа, удалён). */
  trackerEpics: Record<string, QuarterlyPlanTrackerEpic>;
}
