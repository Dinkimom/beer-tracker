import type { TransitionField } from '@/lib/api/types';

/** Tracker / our API rejected a transition because required fields were missing (HTTP 422). */
export class TransitionRequiresFieldsError extends Error {
  readonly errorMessages: string[];

  constructor(errorMessages: string[]) {
    super('Transition requires fields');
    this.name = 'TransitionRequiresFieldsError';
    this.errorMessages = errorMessages;
  }
}

const KNOWN_TRANSITION_FIELD_META: Record<
  string,
  Pick<TransitionField, 'display' | 'schemaType'>
> = {
  comment: { display: 'Комментарий', schemaType: 'string' },
  resolution: { display: 'Резолюция', schemaType: 'resolution' },
};

/**
 * Extract Tracker field ids from messages like:
 * "Вы должны указать значения для полей comment."
 * "You must set values for the fields comment, resolution."
 */
export function parseRequiredFieldIdsFromErrorMessages(messages: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const message of messages) {
    // Do not use \b: Cyrillic "полей" is non-\w, so \b never matches after it.
    const markerMatch = /полей|fields/i.exec(message);
    if (!markerMatch || markerMatch.index == null) continue;
    const afterMarker = message.slice(markerMatch.index + markerMatch[0].length);
    // Field ids are Latin identifiers, optionally comma/semicolon separated.
    for (const part of afterMarker.match(/[a-zA-Z]\w*/g) ?? []) {
      if (seen.has(part)) continue;
      seen.add(part);
      ids.push(part);
    }
  }

  return ids;
}

export function transitionFieldsFromErrorMessages(messages: string[]): TransitionField[] {
  return parseRequiredFieldIdsFromErrorMessages(messages).map((id) => {
    const known = KNOWN_TRANSITION_FIELD_META[id];
    return {
      id,
      display: known?.display ?? id,
      required: true,
      ...(known?.schemaType ? { schemaType: known.schemaType } : {}),
    };
  });
}

export function isTransitionRequiresFieldsError(
  error: unknown
): error is TransitionRequiresFieldsError {
  return error instanceof TransitionRequiresFieldsError;
}
