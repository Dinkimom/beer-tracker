export interface TrackerMetadataFieldDto {
  category?: string;
  display?: string;
  id: string;
  key?: string;
  name?: string;
  options?: string[];
  readonly?: boolean;
  schemaType?: string;
}

export interface TrackerMetadataStatusDto {
  description?: string;
  display: string;
  id: string;
  key: string;
  statusType?: { display?: string; id?: string; key?: string };
}

function normalizeEntityId(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return '';
}

function readSchemaRecord(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

function readStringOptions(rawOptions: unknown): string[] {
  if (!Array.isArray(rawOptions)) {
    return [];
  }
  return rawOptions
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean);
}

function readOptionalStringField(o: Record<string, unknown>, key: string): string | undefined {
  return typeof o[key] === 'string' ? o[key] : undefined;
}

function buildTrackerMetadataFieldDto(
  o: Record<string, unknown>,
  id: string,
  schema: Record<string, unknown> | null | undefined,
  options: string[]
): TrackerMetadataFieldDto {
  return {
    category: readOptionalStringField(o, 'category'),
    display: readOptionalStringField(o, 'display'),
    id,
    key: readOptionalStringField(o, 'key'),
    name: readOptionalStringField(o, 'name'),
    options,
    readonly: typeof o.readonly === 'boolean' ? o.readonly : undefined,
    schemaType: typeof schema?.type === 'string' ? schema.type : undefined,
  };
}

export function mapTrackerMetadataField(raw: unknown): TrackerMetadataFieldDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = normalizeEntityId(o.id);
  if (!id) {
    return null;
  }
  const schema = readSchemaRecord(o.schema);
  const optionsProvider = readSchemaRecord(o.optionsProvider);
  const options = readStringOptions(optionsProvider?.values);
  return buildTrackerMetadataFieldDto(o, id, schema, options);
}

function mapTrackerStatusType(raw: unknown): TrackerMetadataStatusDto['statusType'] {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const t = raw as Record<string, unknown>;
  return {
    display: typeof t.display === 'string' ? t.display : undefined,
    id: typeof t.id === 'string' ? t.id : undefined,
    key: typeof t.key === 'string' ? t.key : undefined,
  };
}

export function mapTrackerMetadataStatus(raw: unknown): TrackerMetadataStatusDto | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === 'string' ? o.key.trim() : '';
  const id = normalizeEntityId(o.id) || key;
  if (!key || !id) {
    return null;
  }
  const display = typeof o.display === 'string' ? o.display : key;
  const statusType = mapTrackerStatusType(o.statusType ?? o.type);
  return {
    description: typeof o.description === 'string' ? o.description : undefined,
    display,
    id,
    key,
    statusType,
  };
}

export function extractTrackerMetadataArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const v = (data as Record<string, unknown>).values;
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

export function readTrackerFieldEnumValuesFromPayload(data: unknown): string[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }
  const optionsProvider = readSchemaRecord((data as Record<string, unknown>).optionsProvider);
  return readStringOptions(optionsProvider?.values);
}
