interface TrackerTokenPayload {
  email?: string;
  organizationId: string;
  token: string;
}

export function parseTrackerTokenFromString(token: string): TrackerTokenPayload | null {
  const trimmed = token.trim();
  return trimmed ? { organizationId: '', token: trimmed } : null;
}

export function parseTrackerTokenFromObject(parsed: unknown): TrackerTokenPayload | null {
  if (!parsed || typeof parsed !== 'object' || !('token' in parsed)) {
    return null;
  }
  const o = parsed as { email?: unknown; organizationId?: unknown; token?: unknown };
  const token = typeof o.token === 'string' ? o.token.trim() : '';
  if (!token) {
    return null;
  }
  const organizationId = typeof o.organizationId === 'string' ? o.organizationId.trim() : '';
  const email = typeof o.email === 'string' ? o.email.trim() : '';
  return email ? { email, organizationId, token } : { organizationId, token };
}

export function parseTrackerTokenJson(raw: string): TrackerTokenPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'string') {
      return parseTrackerTokenFromString(parsed);
    }
    return parseTrackerTokenFromObject(parsed);
  } catch {
    return parseTrackerTokenFromString(raw);
  }
}
