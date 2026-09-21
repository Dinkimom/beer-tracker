import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postProductRegister } from '@/lib/api/auth';

import { submitRegisterForm } from './registerFormSubmit';

vi.mock('@/lib/api/auth', () => ({
  postProductRegister: vi.fn(),
}));

describe('submitRegisterForm', () => {
  const t = (key: string) => key;

  beforeEach(() => {
    vi.mocked(postProductRegister).mockReset();
  });

  it('sends Atlassian email with the token on first-run register', async () => {
    vi.mocked(postProductRegister).mockResolvedValue({
      organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
    });

    const result = await submitRegisterForm({
      jiraEmail: ' ada@example.com ',
      onboardingMode: true,
      organizationName: 'Acme',
      t,
      token: 'atlassian-api-token',
      trackerOrgId: '',
    });

    expect(result).toEqual({ ok: true, organizationId: 'org-1' });
    expect(postProductRegister).toHaveBeenCalledWith({
      jiraEmail: 'ada@example.com',
      orgName: 'Acme',
      token: 'atlassian-api-token',
      trackerOrgId: undefined,
    });
  });
});
