import type { AccessProfile } from '@/lib/access/orgAccess';

import { canUsePlanner } from '@/lib/access/orgAccess';

/** Ответ MCP-инструмента с ошибкой (`isError`), текст — сообщение исключения. */
export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true as const,
  };
}

/** Успешный ответ MCP-инструмента: payload как отформатированный JSON. */
export function toolJson(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/** Текст отказа для пишущих инструментов планера или `null`, если запись разрешена. */
export function plannerWriteDenied(profile: AccessProfile): string | null {
  if (canUsePlanner(profile)) {
    return null;
  }
  return 'forbidden: planner write requires organization admin or team membership';
}

/**
 * Итог операций, которые применяются по очереди и останавливаются на первой ошибке: успех — как есть,
 * ошибка — номер операции, причина и то, что успело примениться до неё.
 */
export function toolOpsResult(
  result: { applied: readonly unknown[]; error: string; ok: false; opIndex: number } | { ok: true }
) {
  return result.ok
    ? toolJson(result)
    : toolError(new Error(`op ${result.opIndex}: ${result.error}; applied before it: ${JSON.stringify(result.applied)}`));
}
