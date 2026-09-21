import type { TrackerIntegrationStored } from './schema';

/**
 * Публичный DTO для планера: только то, что нужно для порогов и отображения статусов.
 */
export interface PlannerIntegrationRulesDto {
  configRevision: number;
  flags: {
    zeroDevPositiveQaRule: boolean;
  };
  releaseReadiness: {
    readyStatusKey: string | null;
  };
  statusDefaultsByTrackerStatusType: Record<string, string>;
  statusOverridesByStatusKey: Record<string, { category?: string; visualToken?: string }>;
  testingFlowMode: 'embedded_in_dev' | 'standalone_qa_tasks' | 'unknown';
  validationThresholds: Record<string, unknown>;
}

export function toPlannerIntegrationRulesDto(
  config: TrackerIntegrationStored | null
): PlannerIntegrationRulesDto {
  if (!config) {
    return {
      configRevision: 0,
      flags: { zeroDevPositiveQaRule: false },
      releaseReadiness: { readyStatusKey: null },
      statusDefaultsByTrackerStatusType: {},
      statusOverridesByStatusKey: {},
      testingFlowMode: 'unknown',
      validationThresholds: {},
    };
  }

  const mode = config.testingFlow?.mode;
  const rr = config.releaseReadiness;
  const readyKey = rr?.readyStatusKey?.trim() ?? '';
  return {
    configRevision: config.configRevision,
    flags: {
      zeroDevPositiveQaRule: config.testingFlow?.zeroDevPositiveQaRule === true,
    },
    releaseReadiness: {
      readyStatusKey: readyKey || null,
    },
    statusDefaultsByTrackerStatusType: { ...(config.statuses?.defaultsByTrackerStatusType ?? {}) },
    statusOverridesByStatusKey: Object.fromEntries(
      Object.entries(config.statuses?.overridesByStatusKey ?? {}).map(([k, v]) => {
        const entry: { category?: string; visualToken?: string } = {};
        if (v.category !== undefined) {
          entry.category = v.category;
        }
        if (v.visualToken !== undefined) {
          entry.visualToken = v.visualToken;
        }
        return [k, entry];
      })
    ),
    testingFlowMode: mode === 'standalone_qa_tasks' ? 'standalone_qa_tasks' : 'embedded_in_dev',
    validationThresholds: { ...(config.validationThresholds ?? {}) },
  };
}
