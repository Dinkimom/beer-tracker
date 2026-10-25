import type { FeatureLanesDocument } from './featureLanesDocument';

type DraftRow = FeatureLanesDocument['draftRows'][number];

function sameRow(a: DraftRow | undefined, b: DraftRow | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function pickRow(
  base: DraftRow | undefined,
  local: DraftRow | undefined,
  remote: DraftRow | undefined
): DraftRow | undefined {
  if (!base) {
    return local ?? remote;
  }
  if (!local) {
    // Удалили локально; правка соседа поверх удаления не воскрешает строку.
    return undefined;
  }
  const localChanged = !sameRow(base, local);
  if (!remote) {
    return localChanged ? local : undefined;
  }
  return localChanged ? local : remote;
}

function mergeDraftRows(base: DraftRow[], local: DraftRow[], remote: DraftRow[]): DraftRow[] {
  const byId = (rows: DraftRow[]) => new Map(rows.map((row) => [row.id, row]));
  const baseById = byId(base);
  const localById = byId(local);
  const remoteById = byId(remote);
  const ids = [...localById.keys(), ...[...remoteById.keys()].filter((id) => !localById.has(id))];
  return ids.flatMap((id) => {
    const row = pickRow(baseById.get(id), localById.get(id), remoteById.get(id));
    return row ? [row] : [];
  });
}

/** Список id: порядок локальный; добавленное соседом — в конец, удалённое соседом — убирается. */
function mergeIdList(base: string[], local: string[], remote: string[]): string[] {
  const baseSet = new Set(base);
  const remoteSet = new Set(remote);
  const kept = local.filter((id) => !baseSet.has(id) || remoteSet.has(id));
  const keptSet = new Set(kept);
  const addedRemotely = remote.filter((id) => !baseSet.has(id) && !keptSet.has(id));
  return [...kept, ...addedRemotely];
}

/**
 * Трёхстороннее слияние документа «по фичам»: `local` — что сохраняет вкладка, `base` — версия,
 * от которой она правила, `remote` — что сейчас на сервере (перенос фичи, соседняя вкладка).
 * Правки вкладки ложатся поверх чужих изменений, а не перезаписывают документ целиком.
 */
export function mergeFeatureLanesDocuments(
  base: FeatureLanesDocument,
  local: FeatureLanesDocument,
  remote: FeatureLanesDocument
): FeatureLanesDocument {
  return {
    draftRows: mergeDraftRows(base.draftRows, local.draftRows, remote.draftRows),
    hiddenIds: mergeIdList(base.hiddenIds, local.hiddenIds, remote.hiddenIds),
    orderIds: mergeIdList(base.orderIds, local.orderIds, remote.orderIds),
  };
}
