/**
 * Ссылки, открывающие чат агента с уже подставленной фразой («посмотри мои запросы в Beer Tracker»).
 * Сам запрос с контекстом лежит в сессии (`agent_sessions`), агент забирает его через MCP.
 */

/** Лимит Cursor на длину deeplink после URL-кодирования. */
const CURSOR_DEEPLINK_MAX = 10_000;
/** Запас под очень длинные URL у браузеров и прокси. */
const CLAUDE_URL_MAX = 8000;

/** Новый чат claude.ai с текстом в поле ввода. Параметр `q` не документирован — текст дублируем в буфер. */
export function claudeNewChatUrl(prompt: string): string | null {
  const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
  return url.length <= CLAUDE_URL_MAX ? url : null;
}

/** Чат Cursor с подставленным промптом (без автозапуска): cursor.com/docs/reference/deeplinks. */
export function cursorPromptUrl(prompt: string): string | null {
  const url = `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(prompt)}`;
  return url.length <= CURSOR_DEEPLINK_MAX ? url : null;
}
