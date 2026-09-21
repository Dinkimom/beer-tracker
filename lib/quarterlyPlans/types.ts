/**
 * Доменные типы квартального планирования (общие для lib и UI).
 */

/** Тип фазы в квартальном плане команды */
export type QuarterlyPlanPhaseKind = 'delivery' | 'discovery';

/** Позиция фазы стори в таймлайне */
export interface StoryPhasePosition {
  /** Длительность в рабочих днях */
  durationDays: number;
  /** Стабильный id фазы (для drag и нескольких фаз на стори) */
  id: string;
  /** delivery — синяя (деливери), discovery — жёлтая */
  kind: QuarterlyPlanPhaseKind;
  /** Индекс спринта в списке спринтов квартала (0-based) */
  sprintIndex: number;
  /** День внутри спринта (0-based, рабочие дни) */
  startDay: number;
}

/** Фазы по ключу стори */
export type StoryPhasesByStory = Record<string, StoryPhasePosition[]>;

/** Тип маркера в строке событий (недельная ячейка) */
export type QuarterlyStoryEventKind =
  | 'delivery_as_planned'
  | 'discovery_as_planned'
  | 'not_taken_on_time'
  | 'release_expected_this_week'
  | 'slipped_new_expected'
  | 'task_released';

/** Событие стори в колонке спринта/недели квартала */
export interface StoryWeekEvent {
  id: string;
  kind: QuarterlyStoryEventKind;
  /** Индекс недельной колонки в таймлайне квартала (0-based) */
  weekIndex: number;
}

/** События по ключу стори */
export type StoryEventsByStory = Record<string, StoryWeekEvent[]>;

/** Спринт в шапке и сетке квартального планировщика */
export interface QuarterlySprintInfo {
  archived?: boolean;
  endDate?: Date;
  id: number | string;
  /** Слот квартала без спринта в трекере */
  isUnregistered?: boolean;
  name: string;
  /** Опциональная метка квартала для отображения */
  quarter?: string | null;
  startDate: Date;
  status?: string;
}
