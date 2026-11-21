/**
 * Подписи событий вкладки «История» и фильтр ленты. Без родовых глаголов («Задача добавлена
 * в спринт», «Срок: 12.10 → 14.10») — пол автора неизвестен.
 */

import type { SprintHistoryEvent } from '@/lib/boardHistory/sprintHistoryTypes';

export type SprintHistoryFilter = 'agent' | 'all' | 'board' | 'tasks';

type Translate = (key: string, params?: Record<string, string>) => string;

const EMPTY_VALUE = '—';
/** Поля заметки, смена которых — перемещение, а не правка текста. */
const NOTE_PLACEMENT_FIELDS = new Set(['assigneeId', 'day', 'parent', 'part']);
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function matchesSprintHistoryFilter(event: SprintHistoryEvent, filter: SprintHistoryFilter): boolean {
  if (filter === 'tasks') return event.source === 'tracker';
  if (filter === 'board') return event.source === 'board';
  if (filter === 'agent') return event.actor.channel === 'agent';
  return true;
}

/** 2026-10-14 → 14.10; остальное как есть. */
function shortValue(value: string | null): string {
  if (!value) return EMPTY_VALUE;
  const date = DATE_ONLY.exec(value);
  return date ? `${date[3]}.${date[2]}` : value;
}

function boardEventKey(event: Extract<SprintHistoryEvent, { source: 'board' }>): string {
  if (event.action !== 'update') return `${event.object}.${event.action}`;
  if (event.object === 'goal' && event.changedFields.includes('done')) {
    return event.done ? 'goal.done' : 'goal.undone';
  }
  if (event.object === 'note' && !event.changedFields.includes('text')
    && event.changedFields.some((field) => NOTE_PLACEMENT_FIELDS.has(field))) {
    return 'note.move';
  }
  return `${event.object}.update`;
}

/** Главная строка события: что произошло. */
export function describeSprintHistoryEvent(event: SprintHistoryEvent, t: Translate): string {
  if (event.source === 'board') {
    return t(`sidebar.history.events.${boardEventKey(event)}`);
  }
  if (event.field === 'sprint') {
    return t(`sidebar.history.events.issue.${event.change}`);
  }
  return t('sidebar.history.events.issue.fieldChange', {
    field: t(`sidebar.history.fields.${event.field}`),
    from: shortValue(event.from),
    to: shortValue(event.to),
  });
}

/** Подпись автора: имя или «Неизвестно», у агента — «через Claude». */
export function sprintHistoryActorLabel(event: SprintHistoryEvent, t: Translate): { name: string; via: string | null } {
  const name = event.actor.name?.trim() || t('sidebar.history.unknownActor');
  if (event.actor.channel !== 'agent') return { name, via: null };
  const brand = event.actor.clientBrand;
  return {
    name,
    via: brand
      ? t('sidebar.history.viaAgentBrand', { brand: brand.charAt(0).toUpperCase() + brand.slice(1) })
      : t('sidebar.history.viaAgent'),
  };
}

/** Ключ дня для группировки (локальная дата). */
export function sprintHistoryDayKey(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
