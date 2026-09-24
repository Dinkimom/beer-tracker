import { describe, expect, it } from 'vitest';

import {
  buildJiraSchedulePutFields,
  jiraDateFieldValue,
  pickJiraScheduleFieldsFromCatalog,
  pickJiraScheduleFieldsFromEditmeta,
} from './jiraScheduleFields';

const EDITMETA = {
  fields: {
    customfield_10015: {
      name: 'Start date',
      schema: { custom: 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker', type: 'date' },
    },
    duedate: { name: 'Due date', schema: { system: 'duedate', type: 'date' } },
    summary: { name: 'Summary', schema: { system: 'summary', type: 'string' } },
  },
};

describe('pickJiraScheduleFieldsFromEditmeta', () => {
  it('maps system duedate and Start date', () => {
    expect(pickJiraScheduleFieldsFromEditmeta(EDITMETA)).toEqual({
      due: { id: 'duedate', schemaType: 'date' },
      dueResolved: true,
      start: { id: 'customfield_10015', schemaType: 'date' },
    });
  });

  it('accepts Russian field names and prefers Start date over Target start', () => {
    expect(
      pickJiraScheduleFieldsFromEditmeta({
        fields: {
          customfield_1: { name: 'Целевое начало', schema: { type: 'date' } },
          customfield_2: { name: 'Дата начала', schema: { type: 'date' } },
          customfield_3: { name: 'Дата окончания', schema: { type: 'date' } },
        },
      })
    ).toEqual({
      due: { id: 'customfield_3', schemaType: 'date' },
      dueResolved: true,
      start: { id: 'customfield_2', schemaType: 'date' },
    });
  });

  it('falls back to Target start when Start date is not on the screen', () => {
    expect(
      pickJiraScheduleFieldsFromEditmeta({
        fields: {
          customfield_8: { name: 'Target start', schema: { type: 'datetime' } },
          duedate: { name: 'Срок исполнения', schema: { system: 'duedate', type: 'date' } },
        },
      }).start
    ).toEqual({ id: 'customfield_8', schemaType: 'datetime' });
  });
});

describe('pickJiraScheduleFieldsFromCatalog', () => {
  it('reads id and name from the global field list', () => {
    expect(
      pickJiraScheduleFieldsFromCatalog([
        { id: 'duedate', name: 'Due Date', schema: { system: 'duedate', type: 'date' } },
        { id: 'customfield_10015', key: 'customfield_10015', name: 'Start date', schema: { type: 'date' } },
        { name: 'Story Points' },
      ])
    ).toEqual({
      due: { id: 'duedate', schemaType: 'date' },
      dueResolved: true,
      start: { id: 'customfield_10015', schemaType: 'date' },
    });
  });
});

describe('buildJiraSchedulePutFields', () => {
  it('formats datetime start fields and date-only due dates', () => {
    expect(jiraDateFieldValue('2026-09-24T15:00:00.000Z', 'datetime')).toBe(
      '2026-09-24T00:00:00.000+0000'
    );
    expect(
      buildJiraSchedulePutFields(
        {
          due: { id: 'duedate', schemaType: 'date' },
          dueResolved: true,
          start: { id: 'customfield_10015', schemaType: 'datetime' },
        },
        { deadline: '2026-09-30', start: '2026-09-24' }
      )
    ).toEqual({
      customfield_10015: '2026-09-24T00:00:00.000+0000',
      duedate: '2026-09-30',
    });
  });

  it('throws when a start date cannot be mapped', () => {
    expect(() =>
      buildJiraSchedulePutFields(
        { due: { id: 'duedate', schemaType: 'date' }, dueResolved: true, start: null },
        { deadline: '2026-09-30', start: '2026-09-24' }
      )
    ).toThrow(/Start date/);
  });
});
