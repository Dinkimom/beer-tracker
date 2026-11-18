import type { Task } from '@/types';

/**
 * Поиск по доске — одно правило для свимлейна и канбана: подстрока в названии, ключе или имени
 * исполнителя. Несовпавшая карточка в обоих видах приглушается, а не пропадает: иначе забытый
 * поиск на канбане выглядел как пропавшие задачи.
 */
export function taskMatchesNameFilter(task: Pick<Task, 'assigneeName' | 'id' | 'name'>, filter: string | undefined): boolean {
  const needle = filter?.trim().toLowerCase();
  if (!needle) return true;
  return (
    task.name.toLowerCase().includes(needle) ||
    task.id.toLowerCase().includes(needle) ||
    (task.assigneeName?.toLowerCase().includes(needle) ?? false)
  );
}
