'use client';

import type { SprintScoreRow } from '@/lib/api/types';

import { SprintScoreSpTpBars } from './SprintScoreSpTpBars';

/** SP/TP по спринту (одна строка score API). */
export function SprintScoreSpTpMetricsPanel({
  hideTp,
  row,
}: {
  hideTp: boolean;
  row: SprintScoreRow;
}) {
  return <SprintScoreSpTpBars hideTp={hideTp} row={row} />;
}
