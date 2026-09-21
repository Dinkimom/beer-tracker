import { describe, expect, it, vi } from 'vitest';

import {
  embeddedProcessSetupFieldRows,
  processSetupFieldMappingSelectOptions,
  standaloneProcessSetupFieldRows,
} from './trackerIntegrationFieldMappingHelpers';

const t = (key: string) => key;

describe('process setup field mapping rows', () => {
  it('includes merge request in both testing modes', () => {
    const embedded = embeddedProcessSetupFieldRows(
      t,
      {
        setDevAssigneeFieldId: vi.fn(),
        setDevEstimateFieldId: vi.fn(),
        setQaEngineerFieldId: vi.fn(),
        setQaEstimateFieldId: vi.fn(),
        setReleaseMrFieldId: vi.fn(),
      },
      {
        devAssigneeFieldId: 'assignee',
        devEstimateFieldId: 'storyPoints',
        qaEngineerFieldId: 'qa',
        qaEstimateFieldId: 'testPoints',
        releaseMrFieldId: 'customfield_20',
      }
    );
    const standalone = standaloneProcessSetupFieldRows(
      t,
      {
        setDevAssigneeFieldId: vi.fn(),
        setDevEstimateFieldId: vi.fn(),
        setReleaseMrFieldId: vi.fn(),
      },
      {
        devAssigneeFieldId: 'assignee',
        devEstimateFieldId: 'storyPoints',
        releaseMrFieldId: 'customfield_20',
      }
    );

    expect(embedded.map((row) => row.id)).toContain('ti-mr');
    expect(standalone.map((row) => row.id)).toContain('ti-mr');
    expect(embedded.find((row) => row.id === 'ti-mr')).toMatchObject({
      optionsKind: 'any',
      value: 'customfield_20',
    });
  });

  it('picks numeric options for estimate rows', () => {
    const lists = {
      any: [{ label: 'Any', value: 'a' }],
      numeric: [{ label: 'Num', value: 'n' }],
    };
    expect(processSetupFieldMappingSelectOptions('numeric', lists)).toEqual(lists.numeric);
  });
});
