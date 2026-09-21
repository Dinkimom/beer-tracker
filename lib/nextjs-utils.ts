/**
 * Утилиты для работы с Next.js API
 */

/**
 * Разрешает params из Next.js route handler
 * В Next.js 16 params может быть Promise или обычным объектом
 * Эта утилита унифицирует работу с params
 */
export function resolveParams<T extends Record<string, string>>(
  params: Promise<T> | T
): Promise<T> {
  return Promise.resolve(params);
}

