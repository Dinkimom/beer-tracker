'use client';

import type { SprintGoalsSummary } from '../../utils/quarterlySprintGoals';

export function QuarterlyPlannerSprintGoalsChecklist({
  goals,
  goalsMetricLabel,
  hasScore,
}: {
  goals: SprintGoalsSummary;
  goalsMetricLabel: string;
  hasScore: boolean;
}) {
  return (
    <div className={hasScore ? 'mb-4' : undefined}>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        {goalsMetricLabel}
      </div>
      <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {goals.checklistItems.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-default items-start gap-2.5 text-sm leading-snug text-gray-800 dark:text-gray-200">
              <input
                checked={item.checked}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 dark:border-gray-600"
                readOnly
                type="checkbox"
              />
              <span
                className={
                  item.checked ? 'text-gray-500 line-through dark:text-gray-400' : undefined
                }
              >
                {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
