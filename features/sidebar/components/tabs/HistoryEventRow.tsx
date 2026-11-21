'use client';

import type { SprintHistoryEvent } from '@/lib/boardHistory/sprintHistoryTypes';
import type { Task } from '@/types';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { OverflowTooltip } from '@/components/OverflowTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { HistoryTaskPassportTooltip } from '@/features/sidebar/components/tabs/HistoryTaskPassportTooltip';
import { describeSprintHistoryEvent, sprintHistoryActorLabel } from '@/features/sidebar/utils/sprintHistoryText';
import { getInitials } from '@/utils/displayUtils';

interface HistoryEventRowProps {
  /** Фото автора, если он есть среди людей доски. */
  avatarUrl: string | null;
  event: SprintHistoryEvent;
  /** Что связывает стрелка — для событий стрелок. */
  linkText: string | null;
  /** Задача события из трекера, если она загружена в планере (название, паспорт без запроса). */
  task: Task | null;
  timeLabel: string;
  /** Показать на доске; без него строка не кликается (объекта на доске уже нет). */
  onSelect?: () => void;
}

/**
 * Разделитель между строками начинается от колонки текста (px-4 + аватар 24 + зазор 10 = 50px),
 * а не от края панели.
 */
const ROW_DIVIDER =
  'relative not-first:before:absolute not-first:before:left-[50px] not-first:before:right-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-gray-200 dark:not-first:before:bg-white/10';

/** Одно событие ленты: кто, что сделал, с чем и когда. */
export function HistoryEventRow({ avatarUrl, event, linkText, onSelect, task, timeLabel }: HistoryEventRowProps) {
  const { t } = useI18n();
  const actor = sprintHistoryActorLabel(event, t);
  const boardText = event.source === 'board' ? event.text ?? linkText : null;
  const previous = event.source === 'board' ? event.previousText : null;
  const issueTitle = event.source === 'tracker' ? task?.name ?? event.issueTitle : null;

  const body = (
    <>
      <Avatar
        avatarUrl={avatarUrl}
        className="mt-0.5 shrink-0"
        initials={event.actor.name?.trim() ? getInitials(actor.name) || '?' : '?'}
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
        {event.source === 'tracker' && (
          <HistoryTaskPassportTooltip issueKey={event.issueKey} knownTask={task}>
            {/* Ключ — не ссылка (клик по строке ведёт на доску): пунктир говорит «наведи — покажу задачу». */}
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" data-testid="sprint-history-issue">
              <span className="font-medium text-gray-700 underline decoration-gray-400 decoration-dotted underline-offset-2 dark:text-gray-200 dark:decoration-gray-500">
                {event.issueKey}
              </span>
              {issueTitle ? ` · ${issueTitle}` : ''}
            </p>
          </HistoryTaskPassportTooltip>
        )}
        {boardText && (
          <OverflowTooltip content={boardText}>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{boardText}</p>
          </OverflowTooltip>
        )}
        {previous && (
          <OverflowTooltip content={previous}>
            <p className="mt-0.5 truncate text-xs text-gray-500 line-through dark:text-gray-400">{previous}</p>
          </OverflowTooltip>
        )}
      </div>
    </>
  );

  return (
    <li className={ROW_DIVIDER} data-testid="sprint-history-event">
      {onSelect ? (
        <button
          className="group relative flex w-full cursor-pointer gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.04] active:bg-black/[0.08] dark:hover:bg-white/[0.05] dark:active:bg-white/[0.1]"
          type="button"
          onClick={onSelect}
        >
          {body}
          {/* Строка ведёт к объекту на доске — стрелка в правом отступе на наведении отличает её от строк, которым некуда вести. */}
          <Icon
            className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500"
            name="arrow-right"
          />
        </button>
      ) : (
        <div className="flex gap-2.5 px-4 py-2.5">{body}</div>
      )}
    </li>
  );
}
