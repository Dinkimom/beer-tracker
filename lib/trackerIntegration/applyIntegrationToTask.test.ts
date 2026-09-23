import type { TrackerIntegrationStored } from './schema';
import type { TrackerIssue } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { mapTrackerIssueToTask } from '@/lib/trackerApi/issues';

import { applyTrackerIntegrationToTask } from './applyIntegrationToTask';

function baseIssue(over: Partial<TrackerIssue> = {}): TrackerIssue {
  return {
    functionalTeam: 'backend',
    id: '1',
    key: 'T-1',
    self: '',
    summary: 's',
    ...over,
  };
}

describe('applyTrackerIntegrationToTask', () => {
  it('leaves task unchanged without config', () => {
    const issue = baseIssue();
    const task = mapTrackerIssueToTask(issue, null);
    expect(applyTrackerIntegrationToTask(issue, task, null)).toEqual(task);
  });

  it('maps platform from field valueMap', () => {
    const issue = baseIssue({ functionalTeam: 'qa-squad' });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      platform: {
        source: 'field',
        fieldId: 'functionalTeam',
        valueMap: [{ trackerValue: 'qa-squad', platform: 'QA' }],
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.team).toBe('QA');
  });

  it('overrides status from overridesByStatusKey', () => {
    const issue = baseIssue({
      status: { display: 'Done', key: 'closed' },
      statusType: { display: 'Done', key: 'done' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        overridesByStatusKey: {
          closed: { category: 'paused' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.status).toBe('paused');
  });

  it('sets statusColorKey from status type when no visualToken override', () => {
    const issue = baseIssue({
      status: { display: 'Closed', key: 'customClosed' },
      statusType: { display: 'Done', key: 'done' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        defaultsByTrackerStatusType: { done: 'done' },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.status).toBe('done');
    expect(next.statusColorKey).toBe('closed');
  });

  it('uses blocked palette (red) even when Jira status type is inProgress', () => {
    const issue = baseIssue({
      status: { display: 'Blocked', key: 'blocked' },
      statusType: { display: 'In Progress', key: 'inProgress' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        // Тип inProgress сам по себе дал бы синий; ключ blocked должен победить.
        defaultsByTrackerStatusType: { inProgress: 'in-progress' },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.statusColorKey).toBe('blocked');
  });

  it('sets statusColorKey from overrides visualToken', () => {
    const issue = baseIssue({
      status: { display: 'X', key: 'customstatus' },
      statusType: { display: 'T', key: 'type1' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        overridesByStatusKey: {
          customstatus: { category: 'in-progress', visualToken: 'closed' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.statusColorKey).toBe('closed');
  });

  it('sets statusColorKey from status id-keyed visualToken override', () => {
    const issue = baseIssue({
      status: { display: 'В работе', id: '10001', key: 'вработе' },
      statusType: { display: 'In Progress', key: 'inProgress' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        defaultsByTrackerStatusType: { inProgress: 'in-progress' },
        overridesByStatusKey: {
          '10001': { visualToken: 'review' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.statusColorKey).toBe('review');
  });

  it('falls back to legacy name-keyed visualToken when id override is absent', () => {
    const issue = baseIssue({
      status: { display: 'В работе', id: '10001', key: 'вработе' },
      statusType: { display: 'In Progress', key: 'inProgress' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        overridesByStatusKey: {
          вработе: { visualToken: 'brown' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.statusColorKey).toBe('brown');
  });

  it('prefers id override when name and id both have visualToken', () => {
    const issue = baseIssue({
      status: { display: 'Исследование', id: '10001', key: 'исследование' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        overridesByStatusKey: {
          '10001': { visualToken: 'review' },
          исследование: { visualToken: 'brown' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.statusColorKey).toBe('review');
  });

  it('sets statusColorKey when tracker status key differs only by underscores', () => {
    const issue = baseIssue({
      status: { display: 'X', key: 'in_progress' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        overridesByStatusKey: {
          inProgress: { visualToken: 'brown' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.statusColorKey).toBe('brown');
  });

  it('uses defaultsByTrackerStatusType when override has only visualToken', () => {
    const issue = baseIssue({
      status: { display: 'W', key: 'weirdstatus' },
      statusType: { display: 'In progress', key: 'inProgress' },
    });
    const task = mapTrackerIssueToTask(issue, null);
    expect(task.status).toBeUndefined();
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      statuses: {
        defaultsByTrackerStatusType: { inProgress: 'in-progress' },
        overridesByStatusKey: {
          weirdstatus: { visualToken: 'closed' },
        },
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.status).toBe('in-progress');
    expect(next.statusColorKey).toBe('closed');
  });

  it('sets testingOnlyByIntegrationRules when embedded user rules match', () => {
    const issue = baseIssue({ storyPoints: 0, testPoints: 5 });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      testingFlow: {
        embeddedTestingOnlyJoins: ['and'],
        embeddedTestingOnlyRules: [{ fieldId: 'storyPoints', operator: 'eq', value: '0' }],
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.testingOnlyByIntegrationRules).toBe(true);
  });

  it('does not set flag when no embedded user rules are configured', () => {
    const issue = baseIssue({ storyPoints: 2, testPoints: 4 });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      testingFlow: {
        qaEstimateFieldId: 'testPoints',
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.testingOnlyByIntegrationRules).toBeUndefined();
  });

  it('sets flag from standalone user rule without implicit platform fallback', () => {
    const issue = baseIssue({ functionalTeam: 'qa-squad' });
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      testingFlow: {
        embeddedTestingOnlyRules: [{ fieldId: 'functionalTeam', operator: 'eq', value: 'qa-squad' }],
        mode: 'standalone_qa_tasks',
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.testingOnlyByIntegrationRules).toBe(true);
    expect(next.hideTestPointsByIntegration).toBe(true);
  });

  it('sets MergeRequestLink from releaseReadiness string field when enabled', () => {
    const issue = {
      ...baseIssue(),
      mergeRequestCustom: 'https://gitlab.example/mr/1',
    } as TrackerIssue;
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      releaseReadiness: {
        mergeRequestFieldId: 'mergeRequestCustom',
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.MergeRequestLink).toBe('https://gitlab.example/mr/1');
  });

  it('sets flag by queue rule using queue object key from issue payload', () => {
    const issue = baseIssue({
      queue: { key: 'NW', display: 'New Widget', id: '39' },
      storyPoints: 2,
      testPoints: 0,
    } as Partial<TrackerIssue>);
    const task = mapTrackerIssueToTask(issue, null);
    const config: TrackerIntegrationStored = {
      configRevision: 1,
      testingFlow: {
        embeddedTestingOnlyRules: [{ fieldId: 'queue', operator: 'eq', value: 'NW' }],
      },
    };
    const next = applyTrackerIntegrationToTask(issue, task, config);
    expect(next.testingOnlyByIntegrationRules).toBe(true);
  });
});
