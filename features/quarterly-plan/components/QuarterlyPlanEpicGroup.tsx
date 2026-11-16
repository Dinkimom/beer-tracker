'use client';

import type { QuarterlyPlanEpic } from '@/lib/quarterlyPlans/quarterlyPlanTypes';

import { Fragment } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { isEpicDone } from '@/lib/quarterlyPlans/quarterlyPlanLayout';

import { useQuarterlyPlanBoard } from '../QuarterlyPlanBoardContext';

import { QuarterlyPlanEpicRow } from './QuarterlyPlanEpicRow';
import { QuarterlyPlanInputRow } from './QuarterlyPlanInputRow';

interface QuarterlyPlanEpicGroupProps {
  epic: QuarterlyPlanEpic;
}

/**
 * Эпик и его задачи (QT1): задачи — такие же строки уровнем ниже, раскрываются по стрелке эпика (QT4).
 * Поле новой задачи стоит там, куда она встанет: под указанной задачей или в конце списка.
 */
export function QuarterlyPlanEpicGroup({ epic }: QuarterlyPlanEpicGroupProps) {
  const { t } = useI18n();
  const { draft, expandedEpicIds, hideDone, onToggleEpic, tasksByEpic, trackerEpics } = useQuarterlyPlanBoard();
  const allTasks = tasksByEpic.get(epic.id) ?? [];
  const tasks = hideDone ? allTasks.filter((task) => !isEpicDone(task, trackerEpics)) : allTasks;
  const adding = draft?.kind === 'newEpic' && draft.parentEpicId === epic.id ? draft : null;
  // Новая задача видна и в свёрнутом эпике: иначе поле ввода некуда показать.
  const expanded = expandedEpicIds.has(epic.id) || adding !== null;
  const input = <QuarterlyPlanInputRow level="task" placeholder={t('quarterlyPlan.addTaskPlaceholder')} />;

  return (
    <>
      <QuarterlyPlanEpicRow
        epic={epic}
        tasks={{ count: allTasks.length, expanded, onToggle: () => onToggleEpic(epic.id) }}
      />
      {expanded
        ? tasks.map((task) => (
            <Fragment key={task.id}>
              <QuarterlyPlanEpicRow epic={task} />
              {adding?.afterId === task.id ? input : null}
            </Fragment>
          ))
        : null}
      {adding && !tasks.some((task) => task.id === adding.afterId) ? input : null}
    </>
  );
}
