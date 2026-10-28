/** Текст ошибки из ответа OAuth token endpoint (RFC 6749 §5.2), иначе `HTTP <status>`. */
export function oauthTokenErrorMessage(data: Record<string, unknown>, status: number): string {
  if (typeof data.error_description === 'string') {
    return data.error_description;
  }
  if (typeof data.error === 'string') {
    return data.error;
  }
  return `HTTP ${status}`;
}
