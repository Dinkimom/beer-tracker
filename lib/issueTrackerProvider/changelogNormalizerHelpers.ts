interface NormalizedChangelogField {
  field: { display?: string; id: string };
  from?: { display?: string; id?: string; key?: string } | null;
  to?: { display?: string; id?: string; key?: string } | null;
}

function normalizeChangelogFieldEndpoint(
  endpoint: { display?: string; id?: string; key?: string } | null | undefined
): NormalizedChangelogField['from'] {
  if (!endpoint || typeof endpoint !== 'object') {
    return endpoint;
  }
  const from = endpoint as Record<string, unknown>;
  if (from.key && !from.display) {
    return {
      key: from.key as string,
      display: from.key as string,
      id: (from.id as string) || (from.key as string),
    };
  }
  return endpoint;
}

export function normalizeChangelogFields(
  fields: NormalizedChangelogField[] | undefined
): NormalizedChangelogField[] | undefined {
  if (!Array.isArray(fields)) {
    return undefined;
  }
  return fields.map((field) => ({
    ...field,
    from: normalizeChangelogFieldEndpoint(field.from),
    to: normalizeChangelogFieldEndpoint(field.to),
  }));
}

export function parseChangelogAuthor(raw: unknown): { display?: string; id?: string } | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const author = raw as Record<string, unknown>;
  return {
    display: author.display as string | undefined,
    id: author.id as string | undefined,
  };
}
