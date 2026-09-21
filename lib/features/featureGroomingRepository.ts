import type { QueryParams } from '@/types';

import { query } from '@/lib/db';

const GROOMING_TODO_SELECT = `
         id,
         feature_id as "featureId",
         text,
         deadline,
         assignee,
         completed,
         display_order as "displayOrder",
         created_at as "createdAt",
         updated_at as "updatedAt"`;

export async function listGroomingTodos(featureId: string): Promise<unknown[]> {
  const result = await query(
    `SELECT ${GROOMING_TODO_SELECT}
       FROM feature_grooming_todos
       WHERE feature_id = $1
       ORDER BY display_order ASC, created_at ASC`,
    [featureId]
  );
  return result.rows;
}

export async function fetchGroomingTodoById(
  featureId: string,
  todoId: string
): Promise<unknown | null> {
  const result = await query(
    `SELECT ${GROOMING_TODO_SELECT}
       FROM feature_grooming_todos
       WHERE id = $1 AND feature_id = $2`,
    [todoId, featureId]
  );
  return result.rows[0] ?? null;
}

export async function nextGroomingTodoDisplayOrder(featureId: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM feature_grooming_todos
       WHERE feature_id = $1`,
    [featureId]
  );
  return (result.rows[0] as { next_order?: number } | undefined)?.next_order ?? 0;
}

export async function insertGroomingTodo(input: {
  displayOrder: number;
  featureId: string;
  text: string;
}): Promise<unknown> {
  const result = await query(
    `INSERT INTO feature_grooming_todos (feature_id, text, display_order, completed)
       VALUES ($1, $2, $3, false)
       RETURNING ${GROOMING_TODO_SELECT}`,
    [input.featureId, input.text, input.displayOrder]
  );
  return result.rows[0];
}

export async function updateGroomingTodoById(input: {
  assignee?: string | null;
  completed?: boolean;
  deadline?: string | null;
  featureId: string;
  text?: string;
  todoId: string;
}): Promise<unknown | null> {
  const updateFields: string[] = [];
  const updateValues: QueryParams = [];
  let paramIndex = 1;

  if (input.text !== undefined) {
    updateFields.push(`text = $${paramIndex++}`);
    updateValues.push(input.text);
  }
  if (input.deadline !== undefined) {
    updateFields.push(`deadline = $${paramIndex++}`);
    updateValues.push(input.deadline || null);
  }
  if (input.assignee !== undefined) {
    updateFields.push(`assignee = $${paramIndex++}`);
    updateValues.push(input.assignee || null);
  }
  if (input.completed !== undefined) {
    updateFields.push(`completed = $${paramIndex++}`);
    updateValues.push(input.completed);
  }
  if (updateFields.length === 0) {
    return null;
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(input.todoId, input.featureId);

  const result = await query(
    `UPDATE feature_grooming_todos
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND feature_id = $${paramIndex + 1}
       RETURNING ${GROOMING_TODO_SELECT}`,
    updateValues
  );
  return result.rows[0] ?? null;
}

export async function deleteGroomingTodoById(
  featureId: string,
  todoId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM feature_grooming_todos
       WHERE id = $1 AND feature_id = $2
       RETURNING id`,
    [todoId, featureId]
  );
  return result.rows.length > 0;
}

export async function fetchGroomingDiagram(
  featureId: string
): Promise<{ content: string; createdAt: string; updatedAt: string } | null> {
  const result = await query(
    `SELECT content::text as content, created_at as "createdAt", updated_at as "updatedAt"
       FROM feature_grooming_diagrams
       WHERE feature_id = $1`,
    [featureId]
  );
  return (result.rows[0] as { content: string; createdAt: string; updatedAt: string } | undefined) ?? null;
}

export async function upsertGroomingDiagram(
  featureId: string,
  content: string
): Promise<unknown> {
  const existingResult = await query(
    `SELECT id FROM feature_grooming_diagrams WHERE feature_id = $1`,
    [featureId]
  );

  if (existingResult.rows.length > 0) {
    const result = await query(
      `UPDATE feature_grooming_diagrams
         SET content = $1::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE feature_id = $2
         RETURNING content, created_at as "createdAt", updated_at as "updatedAt"`,
      [content, featureId]
    );
    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO feature_grooming_diagrams (feature_id, content)
       VALUES ($1, $2::jsonb)
       RETURNING content, created_at as "createdAt", updated_at as "updatedAt"`,
    [featureId, content]
  );
  return result.rows[0];
}
