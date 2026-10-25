import type { BeerTrackerTransactionQuery } from '@/lib/db';
import type { BatchPositionsSchema } from '@/lib/validation';
import type { z } from 'zod';

import { runBeerTrackerTransaction } from '@/lib/db';

import {
  buildTaskPositionsBatchDeleteSql,
  buildTaskPositionsBatchInsertSql,
} from './taskPositionsBatchSql';
import { replaceTaskPositionSegments } from './taskPositionsRepository';

type BatchPosition = z.infer<typeof BatchPositionsSchema>['positions'][number];

const BATCH_INSERT_PARAMS_PER_ROW = 11;

type BatchPositionSqlParam = boolean | number | string | null;

function pushBatchPositionParams(
  params: BatchPositionSqlParam[],
  organizationId: string,
  sprintId: number,
  pos: BatchPosition
): void {
  params.push(
    organizationId,
    sprintId,
    pos.taskId,
    pos.assigneeId,
    pos.startDay,
    pos.startPart,
    pos.duration,
    pos.plannedStartDay ?? null,
    pos.plannedStartPart ?? null,
    pos.plannedDuration ?? null,
    pos.isQa ?? false
  );
}

function buildBatchInsertValues(
  positions: BatchPosition[],
  organizationId: string,
  sprintId: number
): { params: BatchPositionSqlParam[]; valuesParts: string[] } {
  const valuesParts: string[] = [];
  const params: BatchPositionSqlParam[] = [];

  positions.forEach((pos, index) => {
    const baseIndex = index * BATCH_INSERT_PARAMS_PER_ROW + 1;
    const placeholders = Array.from({ length: BATCH_INSERT_PARAMS_PER_ROW }, (_, i) => `$${baseIndex + i}`).join(
      ', '
    );
    valuesParts.push(`(${placeholders})`);
    pushBatchPositionParams(params, organizationId, sprintId, pos);
  });

  return { params, valuesParts };
}

async function deleteExistingBatchPositions(
  tx: BeerTrackerTransactionQuery,
  input: { positions: BatchPosition[]; sprintId: number }
): Promise<void> {
  const taskIds = input.positions.map((p) => p.taskId);
  const placeholders = taskIds.map((_, i) => `$${i + 2}`).join(', ');
  await tx(buildTaskPositionsBatchDeleteSql(placeholders), [input.sprintId, ...taskIds]);
}

async function insertBatchPositions(
  tx: BeerTrackerTransactionQuery,
  input: { organizationId: string; positions: BatchPosition[]; sprintId: number }
): Promise<void> {
  const { params, valuesParts } = buildBatchInsertValues(
    input.positions,
    input.organizationId,
    input.sprintId
  );
  await tx(buildTaskPositionsBatchInsertSql(valuesParts.join(', ')), params);
}

export async function persistBatchPositionsTransaction(input: {
  organizationId: string;
  positions: BatchPosition[];
  sprintId: number;
}): Promise<void> {
  if (input.positions.length === 0) {
    return;
  }
  await runBeerTrackerTransaction(async (tx) => {
    await deleteExistingBatchPositions(tx, input);
    await insertBatchPositions(tx, input);
    for (const pos of input.positions) {
      await replaceTaskPositionSegments(
        {
          organizationId: input.organizationId,
          segments: pos.segments,
          sprintId: input.sprintId,
          taskId: pos.taskId,
        },
        tx
      );
    }
  });
}
