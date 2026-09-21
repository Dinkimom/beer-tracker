export const FEATURE_LANE_DRAFT_ROW_PREFIX = 'feature-draft:';

interface FeatureLaneDraftRow {
  id: string;
  /** Ключи задач, которые висят на черновике, пока его нет в Трекере. */
  issueKeys?: string[];
  name: string;
}

export interface FeatureLanesDocument {
  draftRows: FeatureLaneDraftRow[];
  hiddenIds: string[];
  orderIds: string[];
}

export function isFeatureLaneDraftRowId(rowId: string): boolean {
  return rowId.startsWith(FEATURE_LANE_DRAFT_ROW_PREFIX);
}

export function emptyFeatureLanesDocument(): FeatureLanesDocument {
  return { draftRows: [], hiddenIds: [], orderIds: [] };
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item !== 'string') {
      return [];
    }
    const trimmed = item.trim();
    return trimmed ? [trimmed] : [];
  });
}

function readOptionalIssueKeys(item: object): string[] | undefined {
  if (!('issueKeys' in item)) {
    return undefined;
  }
  return readStringList((item as { issueKeys: unknown }).issueKeys);
}

function readDraftRow(item: unknown): FeatureLaneDraftRow | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const id = 'id' in item && typeof item.id === 'string' ? item.id.trim() : '';
  const name = 'name' in item && typeof item.name === 'string' ? item.name.trim() : '';
  if (!id || !name) {
    return null;
  }
  const issueKeys = readOptionalIssueKeys(item);
  return issueKeys ? { id, issueKeys, name } : { id, name };
}

export function renameFeatureLaneDraftRow(
  document: FeatureLanesDocument,
  rowId: string,
  name: string
): FeatureLanesDocument {
  const trimmed = name.trim();
  if (!trimmed) {
    return document;
  }
  return {
    ...document,
    draftRows: document.draftRows.map((row) =>
      row.id === rowId ? { ...row, name: trimmed } : row
    ),
  };
}

export function replaceFeatureLaneDraftRow(
  document: FeatureLanesDocument,
  draftId: string,
  next: { id: string; name: string }
): FeatureLanesDocument {
  const nextId = next.id.trim();
  const nextName = next.name.trim();
  if (!isFeatureLaneDraftRowId(draftId) || !nextId || !nextName) {
    return document;
  }
  const remap = (id: string) => (id === draftId ? nextId : id);
  return {
    draftRows: document.draftRows.map((row) =>
      row.id === draftId ? { id: nextId, name: nextName } : row
    ),
    hiddenIds: document.hiddenIds.map(remap),
    orderIds: document.orderIds.map(remap),
  };
}

export function pinFeatureLaneTrackerRow(
  document: FeatureLanesDocument,
  row: { id: string; name: string }
): FeatureLanesDocument {
  const id = row.id.trim();
  const name = row.name.trim();
  if (!id || !name || isFeatureLaneDraftRowId(id)) {
    return document;
  }
  if (document.draftRows.some((item) => item.id === id)) {
    return document;
  }
  return {
    ...document,
    draftRows: [...document.draftRows, { id, name }],
  };
}

/** Добавляет черновую строку фичи в документ другого спринта, без дублей. */
export function appendFeatureLaneDraftRow(
  document: FeatureLanesDocument,
  row: { id: string; name: string }
): FeatureLanesDocument {
  const id = row.id.trim();
  const name = row.name.trim();
  if (!id || !name || !isFeatureLaneDraftRowId(id)) {
    return document;
  }
  if (document.draftRows.some((item) => item.id === id)) {
    return document;
  }
  return {
    draftRows: [...document.draftRows, { id, name }],
    hiddenIds: document.hiddenIds,
    orderIds: document.orderIds.includes(id) ? document.orderIds : [...document.orderIds, id],
  };
}

function readDraftRows(value: unknown): FeatureLaneDraftRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const row = readDraftRow(item);
    return row ? [row] : [];
  });
}

function withIssueKeys(row: FeatureLaneDraftRow, issueKeys: string[]): FeatureLaneDraftRow {
  if (issueKeys.length === 0) {
    return { id: row.id, name: row.name, issueKeys: [] };
  }
  return { id: row.id, name: row.name, issueKeys };
}

/**
 * Привязывает задачу к черновой строке фичи (или снимает привязку).
 * Пустой `issueKeys` пишем явно, чтобы сохранение не вернула ключи из соседней копии документа.
 */
export function setFeatureLaneDraftIssueParent(
  document: FeatureLanesDocument,
  issueKey: string,
  draftRowId: string | null
): FeatureLanesDocument {
  const key = issueKey.trim();
  if (!key) {
    return document;
  }
  const targetId = draftRowId?.trim() ?? '';
  const assignTo =
    targetId &&
    isFeatureLaneDraftRowId(targetId) &&
    document.draftRows.some((row) => row.id === targetId)
      ? targetId
      : null;
  let changed = false;
  const draftRows = document.draftRows.map((row) => {
    const current = row.issueKeys ?? [];
    const without = current.filter((item) => item !== key);
    const nextKeys = assignTo === row.id ? [...without, key] : without;
    const same =
      nextKeys.length === current.length && nextKeys.every((item, index) => item === current[index]);
    if (same && (nextKeys.length > 0 || row.issueKeys === undefined)) {
      return row;
    }
    changed = true;
    return withIssueKeys(row, nextKeys);
  });
  return changed ? { ...document, draftRows } : document;
}

/**
 * Если клиент не прислал `issueKeys` у строки, оставляем уже сохранённые.
 * Явный `[]` — снять все привязки.
 */
export function mergePreservedFeatureLaneIssueKeys(
  existing: FeatureLanesDocument | null,
  incoming: FeatureLanesDocument
): FeatureLanesDocument {
  if (!existing) {
    return incoming;
  }
  const existingById = new Map(existing.draftRows.map((row) => [row.id, row.issueKeys]));
  let changed = false;
  const draftRows = incoming.draftRows.map((row) => {
    if (row.issueKeys !== undefined) {
      return row;
    }
    const kept = existingById.get(row.id);
    if (!kept?.length) {
      return row;
    }
    changed = true;
    return { ...row, issueKeys: kept };
  });
  return changed ? { ...incoming, draftRows } : incoming;
}

export function parseFeatureLanesDocument(raw: unknown): FeatureLanesDocument {
  if (!raw || typeof raw !== 'object') {
    return emptyFeatureLanesDocument();
  }
  const record = raw as Record<string, unknown>;
  return {
    draftRows: readDraftRows(record.draftRows),
    hiddenIds: readStringList(record.hiddenIds),
    orderIds: readStringList(record.orderIds),
  };
}
