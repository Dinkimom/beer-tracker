/**
 * Реакции на sticky-note: агрегаты для UI и чистые правила тоггла.
 * Быстрый ряд — как в Miro; полный пикер может поставить любой emoji.
 */

export const STICKY_NOTE_QUICK_REACTION_EMOJIS = ['➕', '👍', '❤️', '🔥', '✅', '🚀'] as const;

interface StickyNoteReactionUser {
  mine: boolean;
  name: string;
}

export interface StickyNoteReaction {
  count: number;
  emoji: string;
  mine: boolean;
  users: StickyNoteReactionUser[];
}

const OWN_REACTION_USER: StickyNoteReactionUser = { mine: true, name: '' };

export const MAX_STICKY_NOTE_REACTION_EMOJI_LENGTH = 32;
const MAX_RECENT_EMOJIS = 24;

export function isStickyNoteReactionEmoji(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_STICKY_NOTE_REACTION_EMOJI_LENGTH
  );
}

/** Цветной emoji, не наследует Arial с body. */
export const STICKY_NOTE_REACTION_EMOJI_CLASS =
  "leading-none [font-family:'Apple_Color_Emoji','Segoe_UI_Emoji','Noto_Color_Emoji',sans-serif]";

export function toggleStickyNoteReaction(
  reactions: StickyNoteReaction[],
  emoji: string
): StickyNoteReaction[] {
  if (!isStickyNoteReactionEmoji(emoji)) {
    return reactions;
  }
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (existing == null) {
    return [...reactions, { count: 1, emoji, mine: true, users: [OWN_REACTION_USER] }];
  }
  if (existing.mine) {
    return removeOwnStickyNoteReaction(reactions, emoji, existing.count);
  }
  return reactions.map((reaction) =>
    reaction.emoji === emoji ? withOwnStickyNoteReactionUser(reaction) : reaction
  );
}

/** Имена в тултипе: свои голоса как «Вы», остальные — display name, в историческом порядке. */
export function formatStickyNoteReactionTooltip(
  reaction: Pick<StickyNoteReaction, 'mine' | 'users'>,
  youLabel: string
): string {
  const labels = (reaction.users ?? [])
    .map((user) => (user.mine ? youLabel : user.name.trim()))
    .filter((label) => label.length > 0);
  return labels.join(', ') || (reaction.mine ? youLabel : '');
}

export function hydrateStickyNoteReactionUsers(
  userIds: readonly string[],
  namesById: Readonly<Record<string, string | null>>,
  currentUserId: string
): StickyNoteReactionUser[] {
  return userIds.map((id) => ({
    mine: id === currentUserId,
    name: lookupReactionUserDisplayName(id, namesById),
  }));
}

function lookupReactionUserDisplayName(
  id: string,
  namesById: Readonly<Record<string, string | null>>
): string {
  return namesById[id]?.trim() || namesById[id.toLowerCase()]?.trim() || '';
}

export function rememberStickyNoteReactionEmoji(
  recent: readonly string[],
  emoji: string
): string[] {
  if (!isStickyNoteReactionEmoji(emoji)) {
    return recent as string[];
  }
  return [emoji, ...recent.filter((item) => item !== emoji)].slice(0, MAX_RECENT_EMOJIS);
}

function removeOwnStickyNoteReaction(
  reactions: readonly StickyNoteReaction[],
  emoji: string,
  count: number
): StickyNoteReaction[] {
  if (count <= 1) {
    return reactions.filter((reaction) => reaction.emoji !== emoji);
  }
  return reactions.map((reaction) =>
    reaction.emoji === emoji ? withoutOwnStickyNoteReactionUser(reaction, count) : reaction
  );
}

function withOwnStickyNoteReactionUser(reaction: StickyNoteReaction): StickyNoteReaction {
  return {
    ...reaction,
    count: reaction.count + 1,
    mine: true,
    users: [...(reaction.users ?? []), OWN_REACTION_USER],
  };
}

function withoutOwnStickyNoteReactionUser(
  reaction: StickyNoteReaction,
  count: number
): StickyNoteReaction {
  return {
    ...reaction,
    count: count - 1,
    mine: false,
    users: (reaction.users ?? []).filter((user) => !user.mine),
  };
}

export function parseStickyNoteReactions(value: unknown): StickyNoteReaction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const parsed: StickyNoteReaction[] = [];
  for (const item of value) {
    const reaction = parseStickyNoteReaction(item);
    if (reaction != null) {
      parsed.push(reaction);
    }
  }
  return parsed;
}

export function mergeStickyNoteReactionsByNoteId(
  overlay: Record<string, StickyNoteReaction[]>,
  incoming: Record<string, StickyNoteReaction[]>
): Record<string, StickyNoteReaction[]> {
  return { ...incoming, ...overlay };
}

/** Оставляем локальный оверлей только для реакций, которые ещё сохраняются. */
export function retainStickyNoteReactionOverlay(
  overlay: Record<string, StickyNoteReaction[]>,
  inflightNoteIds: ReadonlySet<string>
): Record<string, StickyNoteReaction[]> {
  if (inflightNoteIds.size === 0) {
    return {};
  }
  const next: Record<string, StickyNoteReaction[]> = {};
  for (const noteId of inflightNoteIds) {
    if (Object.hasOwn(overlay, noteId)) {
      next[noteId] = overlay[noteId]!;
    }
  }
  return next;
}

export function commentReactionsByNoteId(
  comments: ReadonlyArray<{ id: string; reactions?: readonly StickyNoteReaction[] }>
): Record<string, StickyNoteReaction[]> {
  const next: Record<string, StickyNoteReaction[]> = {};
  for (const comment of comments) {
    next[`comment:${comment.id}`] = [...(comment.reactions ?? [])];
  }
  return next;
}

function parseStickyNoteReaction(value: unknown): StickyNoteReaction | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  const record = value as { count?: unknown; emoji?: unknown; mine?: unknown; users?: unknown };
  if (!isStickyNoteReactionEmoji(record.emoji)) {
    return null;
  }
  const count = typeof record.count === 'number' ? record.count : Number(record.count);
  if (!Number.isInteger(count) || count < 1) {
    return null;
  }
  return {
    count,
    emoji: record.emoji,
    mine: record.mine === true,
    users: parseStickyNoteReactionUsers(record.users),
  };
}

function parseStickyNoteReactionUsers(value: unknown): StickyNoteReactionUser[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const users: StickyNoteReactionUser[] = [];
  for (const item of value) {
    const user = parseStickyNoteReactionUser(item);
    if (user != null) {
      users.push(user);
    }
  }
  return users;
}

function parseStickyNoteReactionUser(value: unknown): StickyNoteReactionUser | null {
  if (value == null || typeof value !== 'object') {
    return null;
  }
  const record = value as { mine?: unknown; name?: unknown };
  if (typeof record.name !== 'string') {
    return null;
  }
  return { mine: record.mine === true, name: record.name.trim() };
}
