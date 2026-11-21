'use client';

import type { SprintHistoryEvent } from '@/lib/boardHistory/sprintHistoryTypes';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { describeSprintHistoryEvent, sprintHistoryActorLabel } from '@/features/sidebar/utils/sprintHistoryText';
import { getInitials } from '@/utils/displayUtils';

interface HistoryEventRowProps {
  /** Фото автора, если он есть среди людей доски. */
  avatarUrl: string | null;
  event: SprintHistoryEvent;
  /** Название задачи по ключу, если задача загружена в планере. */
  taskTitle: string | null;
  timeLabel: string;
  /** Показать на доске; без него строка не кликается (объекта на доске уже нет). */
  onSelect?: () => void;
}

function eventSubject(event: SprintHistoryEvent, taskTitle: string | null): string | null {
  if (event.source === 'tracker') {
    return taskTitle ? `${event.issueKey} · ${taskTitle}` : event.issueKey;
  }
  return event.text;
}

/** Одно событие ленты: кто, что сделал, с чем и когда. */
export function HistoryEventRow({ avatarUrl, event, onSelect, taskTitle, timeLabel }: HistoryEventRowProps) {
  const { t } = useI18n();
  const actor = sprintHistoryActorLabel(event, t);
  const subject = eventSubject(event, taskTitle);
  const previous = event.source === 'board' ? event.previousText : null;

  const body = (
    <>
      <Avatar
        avatarUrl={avatarUrl}
        className="mt-0.5 shrink-0"
        initials={getInitials(actor.name) || '?'}
        initialsVariant={event.actor.channel === 'agent' ? 'primary' : 'default'}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5 text-xs">
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">{actor.name}</span>
          {actor.via && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-violet-500/10 px-1 py-px text-[10px] font-medium text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">
              <Icon className="h-2.5 w-2.5" name="sparkles" />
              {actor.via}
            </span>
          )}
          <time className="ml-auto shrink-0 tabular-nums text-[11px] text-gray-500 dark:text-gray-400" dateTime={event.at}>
            {timeLabel}
          </time>
        </div>
        <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-300">{describeSprintHistoryEvent(event, t)}</p>
        {subject && (
          <OverflowTooltip content={subject}>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{subject}</p>
          </OverflowTooltip>
        )}
        {previous && (
          <OverflowTooltip content={previous}>
            <p className="mt-0.5 truncate text-xs text-gray-400 line-through dark:text-gray-500">{previous}</p>
          </OverflowTooltip>
        )}
      </div>
    </>
  );

  return (
    <li data-testid="sprint-history-event">
      {onSelect ? (
        <button
          className="flex w-full cursor-pointer gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.04] active:bg-black/[0.08] dark:hover:bg-white/[0.05] dark:active:bg-white/[0.1]"
          type="button"
          onClick={onSelect}
        >
          {body}
        </button>
      ) : (
        <div className="flex gap-2.5 px-4 py-2.5">{body}</div>
      )}
    </li>
  );
}
