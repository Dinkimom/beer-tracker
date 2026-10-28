import type { RetroBoard, RetroCardReaction, RetroColumn } from './retroBoardShared';

import { isRecord } from '@/lib/isRecord';

interface Identified {
  id: string;
}

interface ReactionVoteIdentified extends RetroCardReaction, Identified {}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function idSet(items: readonly Identified[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

function byId<T extends Identified>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function sharedOrder(items: readonly Identified[], shared: ReadonlySet<string>): string[] {
  return items.map((item) => item.id).filter((id) => shared.has(id));
}

function orderChanged(base: readonly Identified[], next: readonly Identified[]): boolean {
  const shared = new Set(base.map((item) => item.id).filter((id) => next.some((item) => item.id === id)));
  return sharedOrder(base, shared).join('\0') !== sharedOrder(next, shared).join('\0');
}

function removedIds<T extends Identified>(
  base: readonly T[],
  current: readonly T[],
  incoming: readonly T[],
  keep: (item: T) => boolean
): Set<string> {
  const currentIds = idSet(current);
  const incomingIds = idSet(incoming);
  const removed = new Set<string>();
  for (const item of base) {
    if (keep(item)) continue;
    if (!currentIds.has(item.id) || !incomingIds.has(item.id)) removed.add(item.id);
  }
  return removed;
}

function mergeOrder<T extends Identified>(
  base: readonly T[],
  current: readonly T[],
  incoming: readonly T[],
  removed: ReadonlySet<string>
): string[] {
  const primary = orderChanged(base, incoming) ? incoming : current;
  const secondary = primary === incoming ? current : incoming;
  const alive = idSet([...current, ...incoming]);
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of [...primary, ...secondary]) {
    if (seen.has(item.id) || removed.has(item.id) || !alive.has(item.id)) continue;
    seen.add(item.id);
    result.push(item.id);
  }
  return result;
}


function isIdentified(value: unknown): value is Identified {
  return isRecord(value) && typeof value.id === 'string';
}

function asIdentifiedList(value: unknown): Identified[] {
  if (!Array.isArray(value)) return [];
  const items: Identified[] = [];
  for (const item of value) {
    if (isIdentified(item)) items.push(item);
  }
  return items;
}

function mergeCommentList(base: unknown, current: unknown, incoming: unknown): Identified[] {
  return mergeList(asIdentifiedList(base), asIdentifiedList(current), asIdentifiedList(incoming), () => false);
}

function reactionVoteId(vote: Pick<RetroCardReaction, 'emoji' | 'userId'>): string {
  return `${vote.userId}\0${vote.emoji}`;
}

function asReactionVoteList(value: unknown): ReactionVoteIdentified[] {
  if (!Array.isArray(value)) return [];
  const votes: ReactionVoteIdentified[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.emoji !== 'string') continue;
    const userId = typeof item.userId === 'string' ? item.userId : '';
    const userName = typeof item.userName === 'string' ? item.userName : '';
    votes.push({
      emoji: item.emoji,
      id: reactionVoteId({ emoji: item.emoji, userId }),
      userId,
      userName,
    });
  }
  return votes;
}

function mergeReactionVoteList(base: unknown, current: unknown, incoming: unknown): RetroCardReaction[] {
  return mergeList(
    asReactionVoteList(base),
    asReactionVoteList(current),
    asReactionVoteList(incoming),
    () => false
  ).map(({ emoji, userId, userName }) => ({ emoji, userId, userName }));
}

function mergeEntityField<T extends Identified>(
  key: keyof T,
  base: T,
  current: T,
  incoming: T
): T[keyof T] {
  if (key === ('comments' as keyof T)) {
    return mergeCommentList(base[key], current[key], incoming[key]) as T[keyof T];
  }
  if (key === ('reactions' as keyof T)) {
    return mergeReactionVoteList(base[key], current[key], incoming[key]) as T[keyof T];
  }
  return sameJson(incoming[key], base[key]) ? current[key] : incoming[key];
}

function mergeEntity<T extends Identified>(base: T | undefined, current: T | undefined, incoming: T | undefined): T | null {
  if (!incoming) return current ?? null;
  if (!current || !base) return incoming;
  const merged = { ...current };
  const keys = new Set<keyof T>([...Object.keys(current), ...Object.keys(incoming)] as (keyof T)[]);
  for (const key of keys) {
    if (key === 'id') continue;
    merged[key] = mergeEntityField(key, base, current, incoming);
  }
  return merged;
}

function mergeList<T extends Identified>(
  base: readonly T[],
  current: readonly T[],
  incoming: readonly T[],
  keep: (item: T) => boolean
): T[] {
  const removed = removedIds(base, current, incoming, keep);
  const currentById = byId(current);
  const incomingById = byId(incoming);
  const baseById = byId(base);
  const merged: T[] = [];
  for (const id of mergeOrder(base, current, incoming, removed)) {
    const entity = mergeEntity(baseById.get(id), currentById.get(id), incomingById.get(id));
    if (entity) merged.push(entity);
  }
  return merged;
}

function keepAgreementsColumn(column: RetroColumn): boolean {
  return column.role === 'agreements';
}

/** Трёхсторонняя склейка доски: правки разных карточек не затирают друг друга. */
export function mergeRetroBoards(base: RetroBoard, current: RetroBoard, incoming: RetroBoard): RetroBoard {
  const columns = mergeList(base.columns, current.columns, incoming.columns, keepAgreementsColumn);
  const columnIds = new Set(columns.map((column) => column.id));
  const cards = mergeList(base.cards, current.cards, incoming.cards, () => false).filter((card) =>
    columnIds.has(card.columnId)
  );
  return { sprintId: incoming.sprintId, cards, columns };
}
