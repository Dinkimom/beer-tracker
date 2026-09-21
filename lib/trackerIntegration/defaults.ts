import type { TrackerIntegrationStored } from './schema';

/**
 * Базовый конфиг интеграции для новых организаций.
 * Дальше админка может уточнить поля/значения по метаданным трекера.
 */
export function buildDefaultTrackerIntegrationStored(
  revision = 0
): TrackerIntegrationStored {
  return {
    configRevision: revision,
    platform: {
      fieldId: 'functionalTeam',
      source: 'field',
      valueMap: [
        { platform: 'Web', trackerValue: 'frontend' },
        { platform: 'Back', trackerValue: 'backend' },
        { platform: 'QA', trackerValue: 'qa' },
        { platform: 'DevOps', trackerValue: 'mobile' },
      ],
    },
    testingFlow: {
      devAssigneeFieldId: 'assignee',
      devEstimateFieldId: 'storyPoints',
      qaEngineerFieldId: 'qaEngineer',
      qaEstimateFieldId: 'testPoints',
      embeddedTestingOnlyRules: [
        { fieldId: 'testPoints', operator: 'gt', value: '0' },
        { fieldId: 'functionalTeam', operator: 'eq', value: 'qa' },
      ],
      embeddedTestingOnlyJoins: ['and'],
    },
  };
}
