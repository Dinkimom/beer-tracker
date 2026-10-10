/** Atlassian OAuth 2.0 (3LO) endpoints and Beer Tracker headers/cookies. */

export const ATLASSIAN_AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
export const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
export const ATLASSIAN_ACCESSIBLE_RESOURCES_URL =
  'https://api.atlassian.com/oauth/token/accessible-resources';

/**
 * Classic platform scopes + Jira Software granular scopes (Agile boards/sprints).
 * Classic alone is not enough for `/rest/agile/1.0/*` (401 scope does not match).
 * Enable the same set in Developer Console → Permissions.
 */
export const ATLASSIAN_OAUTH_SCOPES = [
  'read:jira-work',
  'write:jira-work',
  'read:jira-user',
  'offline_access',
  'read:board-scope:jira-software',
  'write:board-scope:jira-software',
  'read:board-scope.admin:jira-software',
  'read:sprint:jira-software',
  'write:sprint:jira-software',
  'read:epic:jira-software',
  'write:epic:jira-software',
  'read:issue:jira-software',
  'write:issue:jira-software',
  'read:project:jira',
] as const;

export const ATLASSIAN_OAUTH_STATE_COOKIE = 'bt_atlassian_oauth_state';
export const ATLASSIAN_OAUTH_RETURN_COOKIE = 'bt_atlassian_oauth_return';

/** Browser → Beer Tracker API: Atlassian cloudId for Jira Cloud OAuth REST. */
export const TRACKER_CLOUD_ID_HEADER = 'x-tracker-cloud-id' as const;

/** URL hash payload key after OAuth callback redirect. */
export const ATLASSIAN_OAUTH_FRAGMENT_KEY = 'atlassian_oauth' as const;

export const JIRA_CLOUD_OAUTH_API_HOST = 'https://api.atlassian.com';
