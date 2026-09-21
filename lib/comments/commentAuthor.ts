/** Имя автора заметки из public.registry_employees: «Имя Фамилия», иначе fullname, иначе email. */
export const COMMENT_AUTHOR_DISPLAY_NAME_SQL = `COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(re.name), ''), NULLIF(TRIM(re.surname), ''))), ''),
        NULLIF(TRIM(re.fullname), ''),
        NULLIF(TRIM(re.email), '')
      )`;

/** Имя автора из beer_tracker.staff (native-контракт). */
export const STAFF_AUTHOR_DISPLAY_NAME_SQL = `COALESCE(
        NULLIF(TRIM(s.display_name), ''),
        NULLIF(TRIM(s.email), '')
      )`;

export function formatCommentAuthorDisplayName(input: {
  email?: string | null;
  fullName?: string | null;
  name?: string | null;
  surname?: string | null;
}): string | null {
  const first = input.name?.trim() ?? '';
  const last = input.surname?.trim() ?? '';
  if (first && last) {
    return `${first} ${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }
  const fullName = input.fullName?.trim() ?? '';
  if (fullName) {
    return fullName;
  }
  const email = input.email?.trim() ?? '';
  return email || null;
}

export function parseCommentAuthorName(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const name = value.trim();
  return name.length > 0 ? name : undefined;
}

export function collectCommentAuthorIds(
  comments: readonly { created_by?: string | null }[]
): string[] {
  const ids = new Set<string>();
  for (const comment of comments) {
    const id = comment.created_by?.trim();
    if (id) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function mergeCommentAuthorNames<T extends { created_by?: string | null }>(
  comments: readonly T[],
  authorsById: Readonly<Record<string, string | null>>
): Array<T & { author_name: string | null }> {
  return comments.map((comment) => {
    const createdBy = comment.created_by?.trim() ?? '';
    return {
      ...comment,
      author_name: createdBy ? (authorsById[createdBy] ?? null) : null,
    };
  });
}
