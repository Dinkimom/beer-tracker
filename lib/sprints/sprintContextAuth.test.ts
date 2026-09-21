import { describe, expect, it } from 'vitest';

import { readSprintContextMcpToken } from './sprintContextAuth';

describe('readSprintContextMcpToken', () => {
  it('prefers X-Sprint-Context-Secret over Authorization', () => {
    const request = new Request('http://localhost/api', {
      headers: {
        authorization: 'Bearer from-auth',
        'x-sprint-context-secret': 'from-header',
      },
    });
    expect(readSprintContextMcpToken(request)).toBe('from-header');
  });

  it('reads Bearer token when header secret is absent', () => {
    const request = new Request('http://localhost/api', {
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(readSprintContextMcpToken(request)).toBe('secret-token');
  });

  it('returns empty string when neither header is set', () => {
    expect(readSprintContextMcpToken(new Request('http://localhost/api'))).toBe('');
  });
});
