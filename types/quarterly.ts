/**
 * Типы данных для квартального планирования
 */

/**
 * Квартал года (1-4)
 */
export type Quarter = 1 | 2 | 3 | 4;

/**
 * Тип техспринта
 */
export type TechSprintType = 'back' | 'qa' | 'web';

/**
 * Запись о техспринте (отправка человека в техническую команду)
 */
export interface TechSprintEntry {
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
  /** Тип техспринта */
  type: TechSprintType;
}

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
export type BoardAvailabilityEventType = 'duty' | 'sick_leave' | 'tech_sprint' | 'vacation';

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
  /** Платформа техспринта — только для {@link eventType} === `tech_sprint` */
  techSprintSubtype?: TechSprintType;
}

/**
 * Данные о техспринтах и отпусках для квартала
 */
export interface QuarterlyAvailability {
  /** События доски (приоритетный источник для свимлейна, если переданы) */
  boardEvents?: BoardAvailabilityEvent[];
  /** ID плана */
  planId: string;
  /** Техспринты */
  techSprints: TechSprintEntry[];
  /** Отпуска */
  vacations: VacationEntry[];
}
