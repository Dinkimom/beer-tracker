'use client';

import type { SprintScoreRow } from '@/lib/api/types';

import { SprintScoreMetricBar } from './SprintScoreMetricBar';
import { SprintScoreSpTpBars } from './SprintScoreSpTpBars';

export function SprintScoreMetricsPanel({
  goalsLabel,
  hideTp,
  rows,
}: {
  goalsLabel: string;
  hideTp: boolean;
  rows: SprintScoreRow[];
}) {
  return (
    <>
      {rows.map((row, index) => (
        <div key={`${row.sprint_id}-${row.team}`}>
          {index > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 my-3" />
          )}
          <div className="space-y-4">
            <SprintScoreMetricBar
              colorClass={{ bar: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300' }}
              completed={Number(row.goals_done)}
              label={goalsLabel}
              total={Number(row.goals_total)}
              value={row.goals_percent}
            />
            <SprintScoreSpTpBars hideTp={hideTp} row={row} />
          </div>
        </div>
      ))}
    </>
  );
}
