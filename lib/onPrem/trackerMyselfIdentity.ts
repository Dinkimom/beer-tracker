/**
 * Идентификатор пользователя в ответе Tracker GET /v3/myself (для сопоставления со staff.tracker_user_id).
 */

function parseNumericTrackerUid(raw: number): string[] {
  const s = String(Math.trunc(raw));
  return s === String(raw) ? [s] : [s, String(raw)];
}

function parseStringTrackerUid(raw: string): string[] {
  const t = raw.trim();
  return t ? [t] : [];
}

function parseTrackerUidCandidates(raw: unknown): string[] {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return parseNumericTrackerUid(raw);
  }
  if (typeof raw === 'string') {
    return parseStringTrackerUid(raw);
  }
  return [];
}

function firstNonEmptyText(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function firstNonEmptyEmail(raw: unknown): string | null {
  const t = firstNonEmptyText(raw);
  return t ? t.toLowerCase() : null;
}

/** Рабочий email из ответа Tracker GET /myself (on-prem вход по токену). */
export function trackerWorkEmailFromMyself(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const o = data as Record<string, unknown>;
  return firstNonEmptyEmail(o.email) ?? firstNonEmptyEmail(o.emailAddress);
}

export function trackerIdentityCandidatesFromMyself(data: unknown): string[] {
  if (typeof data !== 'object' || data === null) {
    return [];
  }
  const o = data as Record<string, unknown>;
  return parseTrackerUidCandidates(o.uid ?? o.trackerUid ?? o.id);
}

function combinedGivenAndFamilyName(data: Record<string, unknown>): string | null {
  const first = firstNonEmptyText(data.firstName);
  const last = firstNonEmptyText(data.lastName);
  const combined = [first, last].filter(Boolean).join(' ').trim();
  return combined.length > 0 ? combined : null;
}

/** Отображаемое имя из /myself; иначе локальная часть email. */
export function trackerDisplayNameFromMyself(data: unknown, emailNorm: string): string {
  if (typeof data === 'object' && data !== null) {
    const o = data as Record<string, unknown>;
    const display = firstNonEmptyText(o.display) ?? firstNonEmptyText(o.displayName);
    if (display) {
      return display;
    }
    const fromNames = combinedGivenAndFamilyName(o);
    if (fromNames) {
      return fromNames;
    }
  }
  const at = emailNorm.indexOf('@');
  const local = at > 0 ? emailNorm.slice(0, at) : emailNorm;
  return local || emailNorm;
}
