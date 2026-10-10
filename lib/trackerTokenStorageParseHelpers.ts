export interface TrackerTokenPayload {
  cloudId?: string;
  email?: string;
  expiresAt?: number;
  organizationId: string;
  refreshToken?: string;
  token: string;
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const t = value.trim();
  return t || undefined;
}

function optionalExpiresAt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function parseTrackerTokenFromString(token: string): TrackerTokenPayload | null {
  const trimmed = token.trim();
  return trimmed ? { organizationId: '', token: trimmed } : null;
}

export function parseTrackerTokenFromObject(parsed: unknown): TrackerTokenPayload | null {
  if (!parsed || typeof parsed !== 'object' || !('token' in parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  const token = typeof o.token === 'string' ? o.token.trim() : '';
  if (!token) {
    return null;
  }
  const organizationId =
    typeof o.organizationId === 'string' ? o.organizationId.trim() : '';
  const email = optionalTrimmedString(o.email);
  const refreshToken = optionalTrimmedString(o.refreshToken);
  const cloudId = optionalTrimmedString(o.cloudId);
  const expiresAt = optionalExpiresAt(o.expiresAt);
  return {
    organizationId,
    token,
    ...(email ? { email } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(cloudId ? { cloudId } : {}),
    ...(expiresAt != null ? { expiresAt } : {}),
  };
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
