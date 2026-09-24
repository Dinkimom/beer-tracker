import { describe, expect, it, vi } from 'vitest';

import { jiraParentPutBody } from './jiraIssueParent';
import {
  extractJiraEstimationBoardId,
  jiraAssigneePutBody,
  pickJiraNamedNumberFieldId,
  pickJiraStoryPointsFieldId,
  splitJiraIssueUpdatePatch,
  updateJiraIssue,
} from './jiraIssueUpdate';

const API_BASE = 'https://jira.example.com/rest/api/2';
const ESTIMATION_URL = 'https://jira.example.com/rest/agile/1.0/issue/PROJ-1/estimation';
const AGILE_ISSUE_URL = 'https://jira.example.com/rest/agile/1.0/issue/PROJ-1';

const STORY_POINTS_FIELD = {
  id: 'customfield_10016',
  name: 'Story Points',
  schema: { custom: 'com.pyxis.greenhopper.jira:jsw-story-points', type: 'number' },
};

function apiWith(methods: {
  get?: ReturnType<typeof vi.fn>;
  put?: ReturnType<typeof vi.fn>;
}) {
  return {
    defaults: { baseURL: API_BASE },
    get: methods.get ?? vi.fn(),
    put: methods.put ?? vi.fn(),
  } as never;
}

describe('splitJiraIssueUpdatePatch', () => {
  it('peels Yandex estimate keys off the Jira fields body', () => {
    expect(splitJiraIssueUpdatePatch({ storyPoints: 5, summary: 'Fix' })).toEqual({
      fields: { summary: 'Fix' },
      storyPoints: 5,
    });
    expect(splitJiraIssueUpdatePatch({ testPoints: null, customfield_1: 2 })).toEqual({
      fields: { customfield_1: 2 },
      testPoints: null,
    });
  });
});

describe('extractJiraEstimationBoardId', () => {
  it('reads originBoardId, GreenHopper rapidViewId and nested issue fields', () => {
    expect(extractJiraEstimationBoardId({ originBoardId: 14684 })).toBe(14684);
    expect(
      extractJiraEstimationBoardId(
        'com.atlassian.greenhopper.service.sprint.Sprint@ab[id=78804,rapidViewId=14684,name=Booking]'
      )
    ).toBe(14684);
    expect(
      extractJiraEstimationBoardId({
        fields: { sprint: { id: 78804, originBoardId: 31 } },
      })
    ).toBe(31);
  });
});

describe('pickJiraStoryPointsFieldId', () => {
  it('prefers the GreenHopper Story Points schema', () => {
    expect(
      pickJiraStoryPointsFieldId([
        { id: 'customfield_1', name: 'Story Points' },
        STORY_POINTS_FIELD,
      ])
    ).toBe('customfield_10016');
  });
});

describe('pickJiraNamedNumberFieldId', () => {
  it('matches field names case-insensitively', () => {
    expect(
      pickJiraNamedNumberFieldId([{ id: 'customfield_20', name: 'Test Points' }], ['test points'])
    ).toBe('customfield_20');
  });
});

describe('jiraParentPutBody', () => {
  it('maps a Yandex parent key string to a Jira parent object', () => {
    expect(jiraParentPutBody('PROJ-26')).toEqual({ key: 'PROJ-26' });
    expect(jiraParentPutBody({ key: 'PROJ-26' })).toEqual({ key: 'PROJ-26' });
    expect(jiraParentPutBody({ id: 'PROJ-26' })).toEqual({ key: 'PROJ-26' });
    expect(jiraParentPutBody(null)).toBeNull();
    expect(jiraParentPutBody('')).toBeNull();
  });
});

describe('jiraAssigneePutBody', () => {
  it('maps Yandex { id } and Cloud accountId separately from Server name', () => {
    expect(jiraAssigneePutBody({ id: 'ada' })).toEqual({ name: 'ada' });
    expect(jiraAssigneePutBody('ada')).toEqual({ name: 'ada' });
    expect(jiraAssigneePutBody({ accountId: '557058:f58131cb-b67d-43c7-b30d-6b58d40bd077' })).toEqual({
      accountId: '557058:f58131cb-b67d-43c7-b30d-6b58d40bd077',
    });
    expect(jiraAssigneePutBody(null)).toEqual({ name: null });
  });
});

describe('updateJiraIssue', () => {
  it('sets storyPoints via Agile estimation instead of a Yandex field name', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { fields: { sprint: { originBoardId: 14684 } } },
    });
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { storyPoints: 5 })).resolves.toEqual(
      {}
    );
    expect(get).toHaveBeenCalledWith(AGILE_ISSUE_URL);
    expect(put).toHaveBeenCalledWith(ESTIMATION_URL, { value: '5' }, { params: { boardId: 14684 } });
    expect(put).not.toHaveBeenCalledWith('/issue/PROJ-1', expect.anything());
  });

  it('passes native Jira fields through PUT /issue', async () => {
    const put = vi.fn().mockResolvedValue({ data: { id: '10001' } });
    await expect(
      updateJiraIssue(apiWith({ put }), 'PROJ-1', {
        customFields: { customfield_10016: 8 },
        summary: 'Fix',
      })
    ).resolves.toEqual({ id: '10001' });
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', {
      fields: { customfield_10016: 8, summary: 'Fix' },
    });
  });

  it('maps a Yandex parent key onto Jira { key } and checks that it stuck', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { fields: { parent: { key: 'PROJ-26' } } },
    });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-6438', { parent: 'PROJ-26' })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-6438', {
      fields: { parent: { key: 'PROJ-26' } },
    });
    expect(get).toHaveBeenCalledWith('/issue/PROJ-6438', { params: { fields: 'parent' } });
  });

  it('falls back to the Story Points custom field when the board is unknown', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/field') {
        return Promise.resolve({ data: [STORY_POINTS_FIELD] });
      }
      return Promise.resolve({ data: {} });
    });
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { storyPoints: 3 })).resolves.toEqual(
      {}
    );
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', { fields: { customfield_10016: 3 } });
  });

  it('assigns via PUT /issue/{key}/assignee with Jira name, not Yandex id', async () => {
    const get = vi.fn().mockResolvedValue({ data: { name: 'ada' } });
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { assigneeId: 'ada' })
    ).resolves.toEqual({});
    expect(get).toHaveBeenCalledWith('/user', { params: { username: 'ada' } });
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1/assignee', { name: 'ada' });
    expect(put).not.toHaveBeenCalledWith('/issue/PROJ-1', expect.anything());
  });

  it('resolves corp email via /user/search to Jira username', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/user/search') {
        return Promise.resolve({
          data: [
            {
              displayName: 'Jane',
              emailAddress: 'jane.doe@example.com',
              name: 'jdoe',
            },
          ],
        });
      }
      return Promise.reject(new Error('404'));
    });
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-26', {
        assigneeId: 'jane.doe@example.com',
      })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-26/assignee', {
      name: 'jdoe',
    });
  });

  it('falls back to name when Jira user lookup fails', async () => {
    const get = vi.fn().mockRejectedValue(new Error('404'));
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { assigneeId: 'ada' })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1/assignee', { name: 'ada' });
  });

  it('maps a Yandex user ref on a custom field to a Jira user body', async () => {
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      updateJiraIssue(apiWith({ put }), 'PROJ-1', {
        customFields: { customfield_10020: { id: 'ada' } },
      })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', {
      fields: { customfield_10020: { name: 'ada' } },
    });
  });

  it('assigns and updates other fields in one patch', async () => {
    const get = vi.fn().mockResolvedValue({ data: { name: 'ada' } });
    const put = vi.fn().mockResolvedValue({ data: { id: '10001' } });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { assigneeId: 'ada', summary: 'Fix' })
    ).resolves.toEqual({ id: '10001' });
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1/assignee', { name: 'ada' });
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', { fields: { summary: 'Fix' } });
  });

  it('maps testPoints onto a Test Points custom field', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [{ id: 'customfield_20', name: 'Test Points' }],
    });
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { testPoints: 2 })).resolves.toEqual(
      {}
    );
    expect(get).toHaveBeenCalledWith('/field');
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', { fields: { customfield_20: 2 } });
  });

  it('maps domain assigneeId onto PUT /assignee', async () => {
    const get = vi.fn().mockResolvedValue({ data: { name: 'ada' } });
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { assigneeId: 'ada', isQa: false })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1/assignee', { name: 'ada' });
  });

  it('maps deadline and start onto duedate and the Start date field', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        fields: {
          customfield_10015: { name: 'Start date', schema: { type: 'date' } },
          duedate: { name: 'Due date', schema: { system: 'duedate', type: 'date' } },
        },
      },
    });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'RND-813', {
        deadline: '2026-09-30',
        start: '2026-09-24',
      })
    ).resolves.toEqual({});
    expect(get).toHaveBeenCalledWith('/issue/RND-813/editmeta');
    expect(put).toHaveBeenCalledWith('/issue/RND-813', {
      fields: { customfield_10015: '2026-09-24', duedate: '2026-09-30' },
    });
  });

  it('uses the field catalog when Start date is missing from editmeta', async () => {
    const get = vi.fn((url: string) => {
      if (url === '/issue/RND-813/editmeta') {
        return Promise.resolve({
          data: { fields: { duedate: { name: 'Due date', schema: { system: 'duedate', type: 'date' } } } },
        });
      }
      if (url === '/field') {
        return Promise.resolve({
          data: [{ id: 'customfield_10015', name: 'Start date', schema: { type: 'date' } }],
        });
      }
      return Promise.reject(new Error(url));
    });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'RND-813', {
        deadline: '2026-09-30',
        start: '2026-09-24',
      })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/RND-813', {
      fields: { customfield_10015: '2026-09-24', duedate: '2026-09-30' },
    });
  });

  it('writes duedate alone when the patch has no start', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        fields: { duedate: { name: 'Due date', schema: { system: 'duedate', type: 'date' } } },
      },
    });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'RND-813', { deadline: '2026-09-30' })
    ).resolves.toEqual({});
    expect(get).not.toHaveBeenCalledWith('/field');
    expect(put).toHaveBeenCalledWith('/issue/RND-813', { fields: { duedate: '2026-09-30' } });
  });

  it('does not write dates when the Start date field cannot be resolved', async () => {
    const get = vi.fn().mockResolvedValue({ data: { fields: {} } });
    const put = vi.fn();
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'RND-813', {
        deadline: '2026-09-30',
        start: '2026-09-24',
      })
    ).rejects.toThrow(/Start date/);
    expect(put).not.toHaveBeenCalled();
  });

  it('maps Jira QA onto assignee unless a custom field id is set', async () => {
    const get = vi.fn().mockResolvedValue({ data: { name: 'ada' } });
    const put = vi.fn().mockResolvedValue({ data: {} });
    await expect(
      updateJiraIssue(apiWith({ get, put }), 'PROJ-1', { assigneeId: 'ada', isQa: true })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1/assignee', { name: 'ada' });
    await expect(
      updateJiraIssue(apiWith({ put }), 'PROJ-1', {
        assigneeField: 'customfield_10020',
        assigneeId: 'ada',
        isQa: true,
      })
    ).resolves.toEqual({});
    expect(put).toHaveBeenCalledWith('/issue/PROJ-1', {
      fields: { customfield_10020: { name: 'ada' } },
    });
  });
});
