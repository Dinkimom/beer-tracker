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

  it('sends Atlassian OAuth fields on first-run register', async () => {
    vi.mocked(postProductRegister).mockResolvedValue({
      organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
    });

    const result = await submitRegisterForm({
      cloudId: ' cloud-1 ',
      expiresAt: 123,
      onboardingMode: true,
      organizationName: 'Acme',
      refreshToken: ' refresh-1 ',
      t,
      token: 'access-token',
      trackerOrgId: '',
    });

    expect(result).toEqual({ ok: true, organizationId: 'org-1' });
    expect(postProductRegister).toHaveBeenCalledWith({
      cloudId: 'cloud-1',
      expiresAt: 123,
      orgName: 'Acme',
      refreshToken: 'refresh-1',
      token: 'access-token',
      trackerOrgId: undefined,
    });
  });
});
