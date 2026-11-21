'use client';

import type { SprintHistoryFilter } from '@/features/sidebar/utils/sprintHistoryText';
import type { SprintHistoryEvent } from '@/lib/boardHistory/sprintHistoryTypes';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/Button';
import { useI18n } from '@/contexts/LanguageContext';
import { toSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { glassLensControlClass } from '@/features/context-menu/contextMenuClasses';
import { HistoryEventRow } from '@/features/sidebar/components/tabs/HistoryEventRow';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useSprintHistory } from '@/features/sidebar/hooks/useSprintHistory';
import {
  matchesSprintHistoryFilter,
  sprintHistoryDayKey,
  sprintHistoryTarget,
} from '@/features/sidebar/utils/sprintHistoryText';
import { useRootStore } from '@/lib/layers';
import { appendPlannerFocusTaskQuery, stripPlannerFocusTaskFromHref } from '@/lib/planner/plannerUrl';

const FILTERS: SprintHistoryFilter[] = ['all', 'tasks', 'board', 'agent'];

function groupByDay(events: readonly SprintHistoryEvent[]): Array<{ day: string; events: SprintHistoryEvent[] }> {
  const groups: Array<{ day: string; events: SprintHistoryEvent[] }> = [];
  for (const event of events) {
    const day = sprintHistoryDayKey(event.at);
    const last = groups.at(-1);
    if (last?.day === day) {
      last.events.push(event);
    } else {
      groups.push({ day, events: [event] });
    }
  }
  return groups;
}

/** Вкладка «История»: кто и что менял в спринте — задачи из трекера, заметки, цели и стрелки доски. */
export function HistoryTab() {
  const { language, t } = useI18n();
  const { allSprintTasksForMetrics, developers, goalsTasks, setMainTab, sprintInfo, taskPositions } = useTaskSidebar();
  const { sprintPlannerUi } = useRootStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<SprintHistoryFilter>('all');
  const { data: events = [], isError, isPending } = useSprintHistory(sprintInfo);

  const tasksById = useMemo(
    () => new Map((allSprintTasksForMetrics ?? goalsTasks).map((task) => [task.id, task])),
    [allSprintTasksForMetrics, goalsTasks]
  );
  // Автор журнала доски — пользователь продукта (id staff), на доске люди — `staff:<id>`.
  const avatars = useMemo(() => {
    const map = new Map<string, string>();
    for (const developer of developers) {
      if (developer.avatarUrl) {
        map.set(developer.id, developer.avatarUrl);
        map.set(developer.id.replace(/^staff:/, ''), developer.avatarUrl);
      }
    }
    return map;
  }, [developers]);
  /**
   * Карточка на доске — через `focusTask` в URL (прокрутка и подсветка, как у уведомлений).
   * Задача спринта, не разложенная на доске, — панель информации о задаче; цель — вкладка «Спринт».
   */
  const selectHandler = useCallback(
    (event: SprintHistoryEvent): (() => void) | undefined => {
      const target = sprintHistoryTarget(event, toSwimlaneCommentTaskId);
      if (!target) return undefined;
      if (target.kind === 'goals') return () => setMainTab('goals');
      const unplacedTask = event.source === 'tracker' && !taskPositions?.has(target.taskId);
      if (unplacedTask) {
        const task = tasksById.get(target.taskId);
        return task ? () => sprintPlannerUi.openTaskInfoPanel(task) : undefined;
      }
      return () => {
        const base = stripPlannerFocusTaskFromHref(pathname, new URLSearchParams(searchParams.toString()));
        router.replace(appendPlannerFocusTaskQuery(base, target.taskId), { scroll: false });
      };
    },
    [pathname, router, searchParams, setMainTab, sprintPlannerUi, taskPositions, tasksById]
  );
  const groups = useMemo(
    () => groupByDay(events.filter((event) => matchesSprintHistoryFilter(event, filter))),
    [events, filter]
  );
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', weekday: 'short' }),
    [language]
  );
  const timeFormat = useMemo(
    () => new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }),
    [language]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-14">
      <div className="flex shrink-0 gap-1 border-b border-gray-200 px-4 py-2 dark:border-gray-700" role="tablist">
        {FILTERS.map((id) => (
          <Button
            key={id}
            aria-selected={filter === id}
            className={`shrink-0 px-2 py-1.5 text-xs leading-none ${glassLensControlClass(filter === id)}`}
            role="tab"
            type="button"
            variant="outline"
            onClick={() => setFilter(id)}
          >
            {t(`sidebar.history.filters.${id}`)}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isPending && <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">{t('sidebar.history.loading')}</p>}
        {isError && <p className="px-4 py-6 text-sm text-red-600 dark:text-red-400">{t('sidebar.history.error')}</p>}
        {!isPending && !isError && groups.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
            {t(events.length === 0 ? 'sidebar.history.empty' : 'sidebar.history.emptyFiltered')}
          </p>
        )}
        {groups.map((group) => (
          <section key={group.day} aria-label={dayFormat.format(new Date(group.events[0]!.at))}>
            <h3 className="sticky top-0 z-[1] bg-white/90 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 backdrop-blur dark:bg-gray-900/90 dark:text-gray-400">
              {dayFormat.format(new Date(group.events[0]!.at))}
            </h3>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {group.events.map((event) => (
                <HistoryEventRow
                  key={event.id}
                  avatarUrl={event.actor.id ? avatars.get(event.actor.id) ?? null : null}
                  event={event}
                  taskTitle={event.source === 'tracker' ? tasksById.get(event.issueKey)?.name ?? null : null}
                  timeLabel={timeFormat.format(new Date(event.at))}
                  onSelect={selectHandler(event)}
                />
              ))}
            </ul>
          </section>
        ))}
        {!isPending && !isError && (
          <p className="px-4 pb-4 pt-3 text-[11px] text-gray-400 dark:text-gray-500">{t('sidebar.history.syncHint')}</p>
        )}
      </div>
    </div>
  );
}
