/**
 * Человекочитаемые сообщения из JSON-тела ошибок Yandex Tracker API.
 * Форматы зависят от метода, часто встречаются `errorMessage`, `message`, `error`, `errorMessages[]`.
 */

function readSingleTrackerErrorMessage(o: Record<string, unknown>): string | undefined {
  const single = o.errorMessage ?? o.message ?? o.error;
  if (typeof single !== 'string') {
    return undefined;
  }
  const t = single.trim();
  return t || undefined;
}

function readTrackerErrorMessagesArray(o: Record<string, unknown>): string | undefined {
  const messages = o.errorMessages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return undefined;
  }
  const parts = messages.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
  return parts.length > 0 ? parts.join('; ') : undefined;
}

function userMessageFromTrackerErrorObject(data: Record<string, unknown>): string | undefined {
  return readSingleTrackerErrorMessage(data) ?? readTrackerErrorMessagesArray(data);
}

export function userMessageFromYandexTrackerErrorBody(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'string') {
    const t = data.trim();
    return t || undefined;
  }
  if (typeof data !== 'object') return undefined;
  return userMessageFromTrackerErrorObject(data as Record<string, unknown>);
}
