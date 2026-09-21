import { z } from 'zod';

const MoveSprintCommentsBodySchema = z.object({
  commentIds: z.array(z.string().uuid()).min(1).max(200),
  targetSprintId: z.number().int().positive(),
});

export function parseMoveSprintCommentsBody(
  body: unknown,
  fromSprintId: number
):
  | { error: string; ok: false; status: 400 }
  | { ok: true; value: { commentIds: string[]; targetSprintId: number } } {
  const parsed = MoveSprintCommentsBodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: 'Validation failed', ok: false, status: 400 };
  }
  if (parsed.data.targetSprintId === fromSprintId) {
    return { error: 'Target sprint must differ', ok: false, status: 400 };
  }
  return { ok: true, value: parsed.data };
}
