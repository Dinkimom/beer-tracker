/**
 * Типы для позиций задач на спринте (свимлейн / занятость).
 */

export type GetTaskInfoFn = (taskId: string) => { devTaskKey?: string; isQa: boolean };
