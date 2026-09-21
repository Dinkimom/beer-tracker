/**
 * Эвристика: имя сотрудника совпадает с локальной частью email (как при insertStaff из user_id).
 */

export function normalizedEmailLocalPart(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.indexOf('@');
  if (at > 0) {
    return e.slice(0, at);
  }
  return e;
}

/** true, если display_name выглядит как «то, что до @» для данного email. */
export function displayNameLooksLikeEmailLocalPart(
  email: string | null | undefined,
  displayName: string
): boolean {
  if (email == null || !email.trim()) {
    return false;
  }
  const local = normalizedEmailLocalPart(email);
  if (!local) {
    return false;
  }
  return displayName.trim().toLowerCase() === local;
}
