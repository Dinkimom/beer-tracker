interface DraftTaskPutBody {
  id?: string;
  linkedTaskIds?: string[];
  name?: string;
  position?: { x: number; y: number };
  storyPoints?: number | null;
  tags?: string[];
  testPoints?: number | null;
}

type DraftTaskUpdateValue = number | string | null;
type DraftTaskUpdateValues = DraftTaskUpdateValue[];

function appendDraftTaskScalarUpdate(
  column: string,
  value: unknown,
  updates: string[],
  values: DraftTaskUpdateValues,
  paramIndex: number
): number {
  if (value === undefined) return paramIndex;
  updates.push(`${column} = $${paramIndex++}`);
  values.push(value as DraftTaskUpdateValue);
  return paramIndex;
}

function appendDraftTaskJsonUpdate(
  column: string,
  value: unknown,
  updates: string[],
  values: DraftTaskUpdateValues,
  paramIndex: number
): number {
  if (value === undefined) return paramIndex;
  updates.push(`${column} = $${paramIndex++}`);
  values.push(JSON.stringify(value));
  return paramIndex;
}

function appendDraftTaskPositionUpdate(
  position: { x: number; y: number } | undefined,
  updates: string[],
  values: DraftTaskUpdateValues,
  paramIndex: number
): number {
  if (position === undefined) return paramIndex;
  updates.push(`position_x = $${paramIndex++}`);
  values.push(position.x);
  updates.push(`position_y = $${paramIndex++}`);
  values.push(position.y);
  return paramIndex;
}

export function buildDraftTaskUpdateQuery(
  body: DraftTaskPutBody,
  now: string
): { paramIndex: number; updates: string[]; values: DraftTaskUpdateValues } {
  const updates: string[] = ['updated_at = $1'];
  const values: DraftTaskUpdateValues = [now];
  let paramIndex = 2;

  paramIndex = appendDraftTaskScalarUpdate('name', body.name, updates, values, paramIndex);
  paramIndex = appendDraftTaskJsonUpdate('tags', body.tags, updates, values, paramIndex);
  paramIndex = appendDraftTaskScalarUpdate('story_points', body.storyPoints, updates, values, paramIndex);
  paramIndex = appendDraftTaskScalarUpdate('test_points', body.testPoints, updates, values, paramIndex);
  paramIndex = appendDraftTaskJsonUpdate('linked_task_ids', body.linkedTaskIds, updates, values, paramIndex);
  paramIndex = appendDraftTaskPositionUpdate(body.position, updates, values, paramIndex);

  return { updates, values, paramIndex };
}
