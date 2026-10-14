import { describe, expect, it, vi } from 'vitest';

import {
  harvestJiraIssueLinks,
  listJiraIssueLinksForKeys,
  mapJiraIssueLink,
  readHarvestedJiraIssueLinks,
} from './jiraIssueLinks';

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

  it('harvests an empty issuelinks array and ignores a missing field', () => {
    const withLinks = {};
    harvestJiraIssueLinks(withLinks, 'RND-1', { issuelinks: [] });
    expect(readHarvestedJiraIssueLinks(withLinks)).toEqual([]);

    const withoutField = {};
    harvestJiraIssueLinks(withoutField, 'RND-1', {});
    expect(readHarvestedJiraIssueLinks(withoutField)).toBeUndefined();
  });

  it('loads issuelinks for many keys in one search', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        issues: [
          {
            fields: {
              issuelinks: [
                {
                  id: '10',
                  outwardIssue: { key: 'MQA-1' },
                  type: { inward: 'is QA for', name: 'QA', outward: 'has linked QA task' },
                },
              ],
            },
            key: 'RND-1',
          },
        ],
        total: 1,
      },
    });
    const links = await listJiraIssueLinksForKeys(
      {
        defaults: { baseURL: 'https://jira.example.com/rest/api/2' },
        post,
      } as never,
      ['RND-1', 'RND-2']
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/search', {
      fields: ['issuelinks'],
      jql: 'key in (RND-1,RND-2)',
      maxResults: 2,
      startAt: 0,
    });
    expect(links['RND-1']).toEqual([
      expect.objectContaining({ id: '10', linkedIssueKey: 'MQA-1' }),
    ]);
    expect(links['RND-2']).toEqual([]);
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
