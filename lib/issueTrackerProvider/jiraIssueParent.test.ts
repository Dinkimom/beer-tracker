import { describe, expect, it, vi } from 'vitest';

import {
  jiraParentKeyFromValue,
  pickJiraEpicLinkFieldId,
  putJiraIssueParent,
} from './jiraIssueParent';

const API_BASE = 'https://jira.example.com/rest/api/2';
const EPIC_ISSUES_URL = 'https://jira.example.com/rest/agile/1.0/epic/PROJ-26/issue';

const EPIC_LINK_FIELD = {
  id: 'customfield_10008',
  name: 'Epic Link',
  schema: { custom: 'com.pyxis.greenhopper.jira:gh-epic-link', type: 'any' },
};

function apiWith(methods: {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  put?: ReturnType<typeof vi.fn>;
}) {
  return {
    defaults: { baseURL: API_BASE },
    get: methods.get ?? vi.fn(),
    post: methods.post ?? vi.fn(),
    put: methods.put ?? vi.fn(),
  } as never;
}

describe('jiraParentKeyFromValue', () => {
  it('reads a Tracker parent key string or ref', () => {
    expect(jiraParentKeyFromValue('PROJ-26')).toBe('PROJ-26');
    expect(jiraParentKeyFromValue({ key: 'PROJ-26' })).toBe('PROJ-26');
    expect(jiraParentKeyFromValue(null)).toBeNull();
  });
});

describe('pickJiraEpicLinkFieldId', () => {
  it('prefers the GreenHopper Epic Link schema', () => {
    expect(pickJiraEpicLinkFieldId([EPIC_LINK_FIELD])).toBe('customfield_10008');
  });
});

describe('putJiraIssueParent', () => {
  it('PUTs REST parent and stops when GET shows it stuck', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { fields: { parent: { key: 'PROJ-26' } } },
    });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(putJiraIssueParent(apiWith({ get, put }), 'PROJ-6438', 'PROJ-26')).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledWith('/issue/PROJ-6438', {
      fields: { parent: { key: 'PROJ-26' } },
    });
    expect(get).toHaveBeenCalledWith('/issue/PROJ-6438', { params: { fields: 'parent' } });
  });

  it('falls back to Epic Link when REST parent is ignored', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { fields: {} } })
      .mockResolvedValueOnce({ data: { fields: {} } })
      .mockResolvedValueOnce({ data: [EPIC_LINK_FIELD] })
      .mockResolvedValueOnce({ data: { fields: {} } })
      .mockResolvedValueOnce({ data: { fields: { epic: { key: 'PROJ-26' } } } });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(putJiraIssueParent(apiWith({ get, put }), 'PROJ-6438', 'PROJ-26')).resolves.toBeUndefined();
    expect(put).toHaveBeenNthCalledWith(1, '/issue/PROJ-6438', {
      fields: { parent: { key: 'PROJ-26' } },
    });
    expect(put).toHaveBeenCalledWith('/issue/PROJ-6438', {
      fields: { customfield_10008: 'PROJ-26' },
    });
  });

  it('adds the issue to an Agile epic when field updates do not stick', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { fields: {} } })
      .mockResolvedValueOnce({ data: { fields: {} } })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { fields: {} } })
      .mockResolvedValueOnce({ data: { fields: { epic: { key: 'PROJ-26' } } } });
    const put = vi.fn().mockResolvedValue({ data: {} });
    const post = vi.fn().mockResolvedValue({ data: undefined });
    await expect(putJiraIssueParent(apiWith({ get, post, put }), 'PROJ-6438', 'PROJ-26')).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith(EPIC_ISSUES_URL, { issues: ['PROJ-6438'] });
  });

  it('throws when Jira does not keep the parent', async () => {
    const get = vi.fn().mockResolvedValue({ data: { fields: {} } });
    const put = vi.fn().mockResolvedValue({ data: {} });
    const post = vi.fn().mockRejectedValue(new Error('not an epic'));
    await expect(putJiraIssueParent(apiWith({ get, post, put }), 'PROJ-6438', 'PROJ-26')).rejects.toThrow(
      'Jira did not accept parent PROJ-26 for PROJ-6438'
    );
  });
});
