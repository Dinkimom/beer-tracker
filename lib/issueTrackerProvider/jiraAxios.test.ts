import { describe, expect, it } from 'vitest';

import { jiraAuthorizationHeader } from './jiraAxios';

describe('jiraAuthorizationHeader', () => {
  it('uses Basic when email is set (Jira Cloud)', () => {
    expect(
      jiraAuthorizationHeader({
        apiToken: 'secret-token',
        email: 'ada@example.com',
      })
    ).toBe(`Basic ${Buffer.from('ada@example.com:secret-token', 'utf8').toString('base64')}`);
  });

  it('uses Bearer PAT when email is empty (Jira Server / Data Center)', () => {
    expect(jiraAuthorizationHeader({ apiToken: 'pat-1' })).toBe('Bearer pat-1');
    expect(jiraAuthorizationHeader({ apiToken: 'pat-1', email: '  ' })).toBe('Bearer pat-1');
  });
});
