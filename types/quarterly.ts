/**
 * Типы данных для квартального планирования
 */

/**
 * Запись об отпуске
 */
export interface VacationEntry {
  /** Дата окончания */
  endDate: string;
  /** ID записи */
  id: string;
  /** ID участника команды */
  memberId: string;
  /** Имя участника */
  memberName: string;
  /** Дата начала */
  startDate: string;
}

/**
 * Тип события доступности на доске (свимлейн / занятость).
 */
export type BoardAvailabilityEventType = 'duty' | 'sick_leave' | 'vacation';

/**
 * Событие доступности участника доски (не привязано к квартальному плану).
 */
export interface BoardAvailabilityEvent {
  /** Дата окончания */
  endDate: string;
  /** Тип события */
  eventType: BoardAvailabilityEventType;
  /** ID записи */
  id: string;
  /** ID участника команды */
  memberId: string;
  /** Имя участника */
  memberName: string;
  /** Дата начала */
  startDate: string;
}

/**
 * Данные об отпусках и событиях доступности для квартала
 */
export interface QuarterlyAvailability {
  /** События доски (приоритетный источник для свимлейна, если переданы) */
  boardEvents?: BoardAvailabilityEvent[];
  /** ID плана */
  planId: string;
  /** Отпуска */
  vacations: VacationEntry[];
}
