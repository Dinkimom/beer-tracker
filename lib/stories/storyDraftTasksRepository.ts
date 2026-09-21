import { query } from '@/lib/db';

import { buildDraftTaskUpdateQuery } from './draftTaskUpdateHelpers';

interface StoryDraftTaskRow {
  created_at: string;
  id: string;
  linked_task_ids: string;
  name: string;
  position_x: number;
  position_y: number;
  story_key: string;
  story_points: number | null;
  tags: string;
  test_points: number | null;
  updated_at: string;
}

export async function listStoryDraftTasks(storyKey: string): Promise<StoryDraftTaskRow[]> {
  const result = await query(
    `SELECT * FROM story_draft_tasks WHERE story_key = $1 ORDER BY created_at ASC`,
    [storyKey]
  );
  return result.rows as StoryDraftTaskRow[];
}

export async function insertStoryDraftTask(input: {
  createdAt: string;
  id: string;
  linkedTaskIds: string[];
  name: string;
  position: { x: number; y: number };
  storyKey: string;
  storyPoints?: number | null;
  tags: string[];
  testPoints?: number | null;
  updatedAt: string;
}): Promise<void> {
  await query(
    `INSERT INTO story_draft_tasks (id, story_key, name, tags, story_points, test_points, linked_task_ids, position_x, position_y, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      input.id,
      input.storyKey,
      input.name,
      JSON.stringify(input.tags),
      input.storyPoints ?? null,
      input.testPoints ?? null,
      JSON.stringify(input.linkedTaskIds),
      input.position.x,
      input.position.y,
      input.createdAt,
      input.updatedAt,
    ]
  );
}

export async function updateStoryDraftTask(
  storyKey: string,
  taskId: string,
  body: Parameters<typeof buildDraftTaskUpdateQuery>[0],
  now: string
): Promise<void> {
  const { paramIndex: idParamIndex, updates, values } = buildDraftTaskUpdateQuery(body, now);
  values.push(taskId, storyKey);
  await query(
    `UPDATE story_draft_tasks SET ${updates.join(', ')} WHERE id = $${idParamIndex} AND story_key = $${idParamIndex + 1}`,
    values
  );
}

export async function deleteStoryDraftTask(storyKey: string, taskId: string): Promise<void> {
  await query(`DELETE FROM story_draft_tasks WHERE id = $1 AND story_key = $2`, [taskId, storyKey]);
}
