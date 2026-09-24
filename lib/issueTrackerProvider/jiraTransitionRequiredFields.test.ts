import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiCache } from '@/lib/cache';

import {
  isEmptyJiraIssueFieldValue,
  jiraUpdateValueForSchema,
  jiraValidatorRequiredFieldIds,
  jiraWorkflowRequiredFieldsByTransition,
  parseJiraFieldsRequired,
} from './jiraTransitionRequiredFields';
import { fetchJiraTransitionFields, transitionJiraIssue } from './jiraTransitions';

const COMPONENTS_META = {
  allowedValues: [
    { id: '10036', name: 'Backend' },
    { id: '10035', name: 'Frontend' },
  ],
  name: 'Компоненты',
  required: false,
  schema: { items: 'component', system: 'components', type: 'array' },
};

const IN_REVIEW_WORKFLOW = {
  workflows: [
    {
      transitions: [
        {
          id: '31',
          name: 'In Review',
          validators: [
            {
              parameters: {
                errorMessage: 'Please fill Components field first',
                fieldsRequired: 'components',
                ruleType: 'fieldRequired',
              },
              ruleKey: 'system:validate-field-value',
            },
          ],
        },
      ],
    },
  ],
};

function apiForRnd815() {
  const get = vi.fn((url: string, config?: { params?: { expand?: string; fields?: string } }): Promise<{ data: unknown }> => {
    if (url.endsWith('/transitions')) {
      return Promise.resolve({
        data: { transitions: [{ fields: {}, id: '31', name: 'In Review' }] },
      });
    }
    if (url.endsWith('/editmeta')) {
      return Promise.resolve({ data: { fields: { components: COMPONENTS_META } } });
    }
    const fields = config?.params?.fields ?? '';
    if (fields.includes('project')) {
      return Promise.resolve({
        data: { fields: { issuetype: { id: '10001' }, project: { id: '10000' } } },
      });
    }
    return Promise.resolve({ data: { fields: { components: [] } } });
  });
  const post = vi.fn((url: string) => {
    if (url === '/workflows') {
      return Promise.resolve({ data: IN_REVIEW_WORKFLOW });
    }
    return Promise.resolve({ data: {} });
  });
  const put = vi.fn().mockResolvedValue({ data: {} });
  return {
    api: {
      defaults: { baseURL: 'https://jira.example.test/rest/api/3' },
      get,
      post,
      put,
    },
    get,
    post,
    put,
  };
}

describe('parseJiraFieldsRequired', () => {
  it('reads a single field, a comma list, and a JSON array', () => {
    expect(parseJiraFieldsRequired('components')).toEqual(['components']);
    expect(parseJiraFieldsRequired('components, fixVersions')).toEqual(['components', 'fixVersions']);
    expect(parseJiraFieldsRequired('["components","customfield_1"]')).toEqual([
      'components',
      'customfield_1',
    ]);
    expect(parseJiraFieldsRequired('')).toEqual([]);
  });
});

describe('jiraValidatorRequiredFieldIds', () => {
  it('keeps fieldRequired validators only', () => {
    expect(jiraValidatorRequiredFieldIds(IN_REVIEW_WORKFLOW.workflows[0]?.transitions[0]?.validators)).toEqual([
      'components',
    ]);
    expect(
      jiraValidatorRequiredFieldIds([
        { parameters: { fieldsRequired: 'summary', ruleType: 'fieldChanged' } },
      ])
    ).toEqual([]);
  });
});

describe('jiraWorkflowRequiredFieldsByTransition', () => {
  it('indexes required fields by transition id', () => {
    expect(jiraWorkflowRequiredFieldsByTransition(IN_REVIEW_WORKFLOW)).toEqual({
      '31': ['components'],
    });
    expect(jiraWorkflowRequiredFieldsByTransition(null)).toEqual({});
  });
});

describe('jiraUpdateValueForSchema', () => {
  it('wraps component ids for a Jira issue update', () => {
    expect(jiraUpdateValueForSchema(COMPONENTS_META.schema, ['10036'])).toEqual([{ id: '10036' }]);
    expect(isEmptyJiraIssueFieldValue([])).toBe(true);
    expect(isEmptyJiraIssueFieldValue([{ id: '10036' }])).toBe(false);
  });
});

describe('Jira off-screen required transition fields', () => {
  beforeEach(() => {
    apiCache.deleteByPattern(/^jira:workflow-required:/);
  });

  it('adds an empty validator field so the transition modal can open', async () => {
    const { api, post } = apiForRnd815();
    await expect(fetchJiraTransitionFields(api as never, 'RND-815', '31')).resolves.toEqual([
      {
        display: 'Компоненты',
        id: 'components',
        options: [
          { label: 'Backend', value: '10036' },
          { label: 'Frontend', value: '10035' },
        ],
        required: true,
        schemaItems: 'component',
        schemaType: 'array',
      },
    ]);
    expect(post).toHaveBeenCalledWith('/workflows', {
      projectAndIssueTypes: [{ issueTypeId: '10001', projectId: '10000' }],
    });
  });

  it('writes the validator field on the issue before the transition', async () => {
    const { api, post, put } = apiForRnd815();
    await expect(
      transitionJiraIssue(api as never, 'RND-815', '31', { components: ['10036'] })
    ).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledWith('/issue/RND-815', {
      fields: { components: [{ id: '10036' }] },
    });
    expect(post).toHaveBeenCalledWith('/issue/RND-815/transitions', {
      transition: { id: '31' },
    });
  });

  it('leaves a required field on the transition when it is already on the screen', async () => {
    const { api, post, put } = apiForRnd815();
    api.get.mockImplementation((url: string) => {
      if (String(url).endsWith('/transitions')) {
        return Promise.resolve({
          data: {
            transitions: [
              {
                fields: {
                  components: COMPONENTS_META,
                },
                id: '31',
              },
            ],
          },
        });
      }
      return Promise.resolve({
        data: { fields: { issuetype: { id: '10001' }, project: { id: '10000' } } },
      });
    });
    await expect(
      transitionJiraIssue(api as never, 'RND-815', '31', { components: ['10036'] })
    ).resolves.toBeUndefined();
    expect(put).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledWith('/issue/RND-815/transitions', {
      fields: { components: ['10036'] },
      transition: { id: '31' },
    });
  });
});
