import type { SwimlaneCardLayer, SwimlaneCardLayerWrite } from '@/lib/swimlane/swimlaneCardLayers';

import { query, runBeerTrackerTransaction } from '@/lib/db';

interface CardLayerRow {
  card_id: string;
  layer: number;
  updated_at: Date | string;
}

function revFromUpdatedAt(value: Date | string): number {
  const time = (typeof value === 'string' ? new Date(value) : value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export async function listSwimlaneCardLayers(input: {
  organizationId: string;
  sprintId: number;
}): Promise<SwimlaneCardLayer[]> {
  const result = await query<CardLayerRow>(
    `SELECT card_id, layer, updated_at
     FROM swimlane_card_layers
     WHERE organization_id = $1::uuid AND sprint_id = $2`,
    [input.organizationId, input.sprintId]
  );
  return result.rows.map((row) => ({
    cardId: row.card_id,
    layer: row.layer,
    rev: revFromUpdatedAt(row.updated_at),
  }));
}

/** Пишет слои одной транзакцией; `layer: null` удаляет ручной слой карточки. */
export async function writeSwimlaneCardLayers(input: {
  layers: readonly SwimlaneCardLayerWrite[];
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  if (input.layers.length === 0) {
    return;
  }
  await runBeerTrackerTransaction(async (tx) => {
    for (const { cardId, layer } of input.layers) {
      if (layer == null) {
        await tx(
          `DELETE FROM swimlane_card_layers
           WHERE organization_id = $1::uuid AND sprint_id = $2 AND card_id = $3`,
          [input.organizationId, input.sprintId, cardId]
        );
        continue;
      }
      await tx(
        `INSERT INTO swimlane_card_layers (organization_id, sprint_id, card_id, layer)
         VALUES ($1::uuid, $2, $3, $4)
         ON CONFLICT (organization_id, sprint_id, card_id) DO UPDATE
         SET layer = EXCLUDED.layer,
             updated_at = CURRENT_TIMESTAMP`,
        [input.organizationId, input.sprintId, cardId, layer]
      );
    }
  });
}
