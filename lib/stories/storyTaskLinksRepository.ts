import { query } from '@/lib/db';

export async function listStoryTaskLinks(storyKey: string): Promise<unknown[]> {
  const result = await query(
    `SELECT 
        id,
        from_task_id,
        to_task_id,
        created_at
      FROM story_task_links 
      WHERE story_key = $1
      ORDER BY created_at`,
    [storyKey]
  );
  return result.rows;
}

export async function insertStoryTaskLink(input: {
  fromTaskId: string;
  id: string;
  storyKey: string;
  toTaskId: string;
}): Promise<unknown | null> {
  const result = await query(
    `INSERT INTO story_task_links (id, story_key, from_task_id, to_task_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (story_key, from_task_id, to_task_id) 
      DO NOTHING
      RETURNING *`,
    [input.id, input.storyKey, input.fromTaskId, input.toTaskId]
  );
  return result.rows[0] ?? null;
}

export async function deleteStoryTaskLinkById(storyKey: string, linkId: string): Promise<void> {
  await query('DELETE FROM story_task_links WHERE story_key = $1 AND id = $2', [storyKey, linkId]);
}

export async function deleteStoryTaskLinkByEndpoints(
  storyKey: string,
  fromTaskId: string,
  toTaskId: string
): Promise<void> {
  await query(
    'DELETE FROM story_task_links WHERE story_key = $1 AND from_task_id = $2 AND to_task_id = $3',
    [storyKey, fromTaskId, toTaskId]
  );
}
