/**
 * Типы для TaskTimeline
 */

export interface StatusDuration {
  createdBy?: {
    display?: string;
    id?: string;
  };
  durationMs: number;
  endTime: string | null;
  endTimeMs: number;
  startTime: string;
  startTimeMs: number;
  statusKey: string;
  statusName: string;
}

export interface StatusSummary {
  count: number;
  statusKey: string;
  statusName: string;
  totalDurationMs: number; // Количество раз, когда задача была в этом статусе
}

