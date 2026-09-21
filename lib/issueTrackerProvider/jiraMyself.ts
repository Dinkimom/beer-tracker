import type { AxiosInstance } from 'axios';

interface JiraMyselfRaw {
  accountId?: string;
  avatarUrls?: { '48x48'?: string };
  displayName?: string;
  emailAddress?: string | null;
  key?: string;
  name?: string;
}

interface JiraMyselfUser {
  avatarUrl: string | null;
  display: string;
  email: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  login: string;
  trackerUid: string;
  uid: string;
  [key: string]: unknown;
}

function splitDisplayName(display: string): { firstName: string; lastName: string } {
  const parts = display.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

export function mapJiraMyself(raw: unknown): JiraMyselfUser | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraMyselfRaw;
  const login = row.name?.trim() || row.key?.trim() || row.accountId?.trim() || '';
  if (!login) {
    return null;
  }
  const display = row.displayName?.trim() || login;
  const email = row.emailAddress?.trim() || '';
  const { firstName, lastName } = splitDisplayName(display);
  return {
    avatarUrl: row.avatarUrls?.['48x48']?.trim() || null,
    display,
    email,
    emailAddress: email,
    firstName,
    lastName,
    login,
    trackerUid: login,
    uid: login,
  };
}

export async function fetchJiraCurrentUser(api: AxiosInstance): Promise<JiraMyselfUser> {
  const { data } = await api.get<unknown>('/myself');
  const mapped = mapJiraMyself(data);
  if (!mapped) {
    throw new Error('Jira GET /myself returned an empty user');
  }
  return mapped;
}
