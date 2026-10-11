import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postProductRegister } from '@/lib/api/auth';

import { registerTrackerApiUrl, submitRegisterForm } from './registerFormSubmit';

vi.mock('@/lib/api/auth', () => ({
  postProductRegister: vi.fn(),
}));

describe('submitRegisterForm', () => {
  const t = (key: string) => key;

  beforeEach(() => {
    vi.mocked(postProductRegister).mockReset();
  });

  it('sends Atlassian OAuth fields on first-run register', async () => {
    vi.mocked(postProductRegister).mockResolvedValue({
      organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
    });

    const result = await submitRegisterForm({
      cloudId: ' cloud-1 ',
      expiresAt: 123,
      onboardingMode: true,
      organizationName: 'Acme',
      provider: 'jira-cloud',
      refreshToken: ' refresh-1 ',
      t,
      token: 'access-token',
      trackerApiBaseUrl: ' https://acme.atlassian.net/rest/api/3 ',
      trackerOrgId: '',
    });

    expect(result).toEqual({ ok: true, organizationId: 'org-1' });
    expect(postProductRegister).toHaveBeenCalledWith({
      cloudId: 'cloud-1',
      expiresAt: 123,
      orgName: 'Acme',
      provider: 'jira-cloud',
      refreshToken: 'refresh-1',
      token: 'access-token',
      trackerApiBaseUrl: 'https://acme.atlassian.net/rest/api/3',
      trackerOrgId: undefined,
    });
  });
});

describe('registerTrackerApiUrl', () => {
  const input = {
    atlassianSiteUrl: 'https://acme.atlassian.net',
    typedApiUrl: 'https://jira.example.com/rest/api/2',
  };

  it('derives the Jira Cloud URL from the Atlassian OAuth site', () => {
    expect(registerTrackerApiUrl('jira-cloud', input)).toBe('https://acme.atlassian.net/rest/api/3');
  });

  it('returns empty for Jira Cloud until Atlassian is connected', () => {
    expect(registerTrackerApiUrl('jira-cloud', { ...input, atlassianSiteUrl: '' })).toBe('');
  });

  it('drops a URL left over from another tracker for Yandex Tracker', () => {
    expect(registerTrackerApiUrl('tracker', input)).toBe('');
  });

  it('uses the typed URL for Jira Data Center', () => {
    expect(registerTrackerApiUrl('jira-onprem', input)).toBe('https://jira.example.com/rest/api/2');
  });
});
