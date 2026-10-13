import { describe, expect, it } from 'vitest';

import { mapJiraIssueLink } from './jiraIssueLinks';

describe('mapJiraIssueLink', () => {
  it('keeps the outward phrase of a custom link type', () => {
    expect(
      mapJiraIssueLink('RND-1', {
        id: '10',
        type: { name: 'QA', inward: 'is QA for', outward: 'has linked QA task' },
        outwardIssue: { key: 'MQA-1', fields: { summary: 'QA', status: { name: 'Open' } } },
      })
    ).toMatchObject({
      id: '10',
      direction: 'outward',
      relationship: null,
      relationshipLabel: 'has linked QA task',
      linkedIssueKey: 'MQA-1',
    });
  });

  it('uses the inward phrase when the current issue is the inward end', () => {
    expect(
      mapJiraIssueLink('RND-1', {
        id: '11',
        type: {
          name: 'Sequence',
          inward: 'has to be done after',
          outward: 'has to be done before',
        },
        inwardIssue: { key: 'RND-2' },
      })
    ).toMatchObject({
      direction: 'inward',
      relationship: null,
      relationshipLabel: 'has to be done after',
      linkedIssueKey: 'RND-2',
    });
  });

  it('drops hierarchy links', () => {
    expect(
      mapJiraIssueLink('RND-1', {
        id: '12',
        type: { inward: 'is parent of', outward: 'is subtask for' },
        outwardIssue: { key: 'RND-2' },
      })
    ).toBeNull();
  });
});
