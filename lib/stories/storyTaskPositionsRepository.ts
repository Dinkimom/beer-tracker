import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';

export async function listStoryTaskPositions(
  storyKey: string
): Promise<Array<{ positionX: number; positionY: number; taskKey: string }>> {
  const result = await query(
    `SELECT 
        task_key as "taskKey",
        position_x as "positionX",
        position_y as "positionY"
      FROM story_task_positions
      WHERE story_key = $1`,
    [storyKey]
  );
  return result.rows as Array<{ positionX: number; positionY: number; taskKey: string }>;
}

export async function replaceStoryTaskPositions(
  storyKey: string,
  positions: Array<{ positionX: number; positionY: number; taskKey: string }>
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      qualifyBeerTrackerTables('DELETE FROM story_task_positions WHERE story_key = $1'),
      [storyKey]
    );

    let insertedCount = 0;
    for (const pos of positions) {
      if (pos.taskKey && typeof pos.positionX === 'number' && typeof pos.positionY === 'number') {
        await client.query(
          qualifyBeerTrackerTables(`INSERT INTO story_task_positions (story_key, task_key, position_x, position_y)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (story_key, task_key) 
             DO UPDATE SET position_x = $3, position_y = $4, updated_at = CURRENT_TIMESTAMP`),
          [storyKey, pos.taskKey, Math.round(pos.positionX), Math.round(pos.positionY)]
        );
        insertedCount++;
      }
    }

    await client.query('COMMIT');
    return insertedCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
