/**
 * Типы для автоматической расстановки задач
 */

import type { TaskLink, TaskPosition } from '@/types';

/**
 * Результат автоматической расстановки задач
 */
export interface AutoAssignResult {
  links: TaskLink[];
  positions: Map<string, TaskPosition>;
}

/**
 * Интервал времени (в ячейках)
 */
export interface TimeInterval {
  end: number;
  start: number;
}

