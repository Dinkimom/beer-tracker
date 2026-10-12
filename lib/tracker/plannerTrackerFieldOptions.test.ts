import { describe, expect, it } from 'vitest';

import { plannerTrackerFieldIsFixedList, plannerTrackerFieldOptions } from './plannerTrackerFieldOptions';

describe('plannerTrackerFieldOptions', () => {
  it('labels fields by name and skips ones already on the card', () => {
    expect(
      plannerTrackerFieldOptions(
        [
          { id: 'customfield_10046', key: 'customfield_10046', name: 'Need QA test' },
          { display: 'Customer', id: 'customer', key: 'customer', name: 'Customer' },
          { id: 'customfield_10766', name: 'Need architecture review' },
        ],
        new Set(['customer'])
      )
    ).toEqual([
      {
        id: 'customfield_10766',
        label: 'Need architecture review',
        name: 'Need architecture review',
      },
      {
        id: 'customfield_10046',
        label: 'Need QA test · customfield_10046',
        name: 'Need QA test',
      },
    ]);
  });
});

describe('plannerTrackerFieldIsFixedList', () => {
  it('recognizes select fields and fields that already list their values', () => {
    expect(plannerTrackerFieldIsFixedList(undefined)).toBe(false);
    expect(plannerTrackerFieldIsFixedList({ id: 'summary', schemaType: 'string' })).toBe(false);
    expect(
      plannerTrackerFieldIsFixedList({
        id: 'customfield_10046',
        schemaCustom: 'com.atlassian.jira.plugin.system.customfieldtypes:select',
        schemaType: 'option',
      })
    ).toBe(true);
    expect(
      plannerTrackerFieldIsFixedList({
        id: 'customfield_10771',
        schemaCustom: 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect',
        schemaType: 'array',
      })
    ).toBe(true);
    expect(plannerTrackerFieldIsFixedList({ id: 'customer', options: ['Northwind'] })).toBe(true);
  });
});
