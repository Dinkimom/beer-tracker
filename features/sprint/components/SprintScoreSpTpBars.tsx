'use client';

import type { SprintScoreRow } from '@/lib/api/types';

import { SprintScoreMetricBar } from './SprintScoreMetricBar';

export function SprintScoreSpTpBars({ hideTp, row }: { hideTp: boolean; row: SprintScoreRow }) {
  return (
    <div className="space-y-4">
      <SprintScoreMetricBar
        colorClass={{ bar: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300' }}
        completed={row.sp_done}
        label="SP"
        total={row.sp_total}
        value={row.sp_done_percent}
      />
      {!hideTp && row.qa_total > 0 && (
        <SprintScoreMetricBar
          colorClass={{ bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' }}
          completed={row.qa_done}
          label="TP"
          total={row.qa_total}
          value={row.tp_done_percent}
        />
      )}
    </div>
  );
}
