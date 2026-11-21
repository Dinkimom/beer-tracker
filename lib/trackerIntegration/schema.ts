/**
 * Конфигурация интеграции трекера: `organizations.settings.trackerIntegration`.
 * См. .spec-workflow/specs/tracker-integration-admin/design.md
 */

import type { TaskStatus } from '@/utils/statusMapper';

import { z } from 'zod';

/** Платформа планера (совпадает с Task.team). */
const TrackerIntegrationPlatformSchema = z.enum(['Back', 'Web', 'QA', 'DevOps']);

/** Категория статуса в приложении. */
export const TaskStatusCategorySchema = z.enum(['todo', 'in-progress', 'paused', 'done']);

const PlatformValueMapEntrySchema = z
  .object({
    platform: TrackerIntegrationPlatformSchema,
    trackerValue: z.string().min(1),
  })
  .strict();

const PlatformConfigSchema = z
  .object({
    fallbackPlatform: TrackerIntegrationPlatformSchema.optional(),
    fieldId: z.string().min(1).optional(),
    source: z.enum(['field', 'tags']),
    valueMap: z.array(PlatformValueMapEntrySchema).default([]),
  })
  .strict();

const EmbeddedTestingOnlyOperatorSchema = z.enum(['eq', 'gt', 'lt', 'gte', 'lte']);

const EmbeddedTestingOnlyRuleSchema = z
  .object({
    fieldId: z.string().min(1),
    operator: EmbeddedTestingOnlyOperatorSchema,
    value: z.string(),
  })
  .strict();

/** Общая форма testingFlow: strict — в PUT, passthrough — чтение из БД при лишних ключах. */
const TestingFlowConfigShapeSchema = z.object({
  devAssigneeFieldId: z.string().min(1).optional(),
  devEstimateFieldId: z.string().min(1).optional(),
  embeddedTestingOnlyJoins: z.array(z.enum(['and', 'or'])).optional(),
  embeddedTestingOnlyRules: z.array(EmbeddedTestingOnlyRuleSchema).optional(),
  mode: z.enum(['embedded_in_dev', 'standalone_qa_tasks']).optional(),
  qaEngineerFieldId: z.string().min(1).optional(),
  qaEstimateFieldId: z.string().min(1).optional(),
  standaloneClassification: z.record(z.string(), z.unknown()).optional(),
  zeroDevPositiveQaRule: z.boolean().optional(),
});

const TestingFlowConfigSchema = TestingFlowConfigShapeSchema.strict();

/** Для PATCH в трекер: достать маппинг полей, даже если весь trackerIntegration не проходит strict-парс. */
const TestingFlowConfigLooseSchema = TestingFlowConfigShapeSchema.passthrough();

type TestingFlowConfigLoose = z.infer<typeof TestingFlowConfigLooseSchema>;

export function parseTestingFlowConfigLoose(raw: unknown): TestingFlowConfigLoose | null {
  const r = TestingFlowConfigLooseSchema.safeParse(raw);
  return r.success ? r.data : null;
}

const StatusOverrideSchema = z
  .object({
    category: TaskStatusCategorySchema.optional(),
    visualToken: z.string().min(1).optional(),
  })
  .strict()
  .refine((v) => v.category !== undefined || v.visualToken !== undefined, {
    message: 'Status override must set category and/or visualToken',
  });

const StatusesConfigSchema = z
  .object({
    defaultsByTrackerStatusType: z.record(z.string(), TaskStatusCategorySchema).optional(),
    lastMetadataFetchedAt: z.string().optional(),
    overridesByStatusKey: z.record(z.string(), StatusOverrideSchema).optional(),
  })
  .strict();

/**
 * Ключи, которые писали старые версии (вкладка «Релизы», статус готовности). В сохранённых
 * настройках они могут остаться — при разборе отбрасываются, чтобы строгая схема их не отвергла.
 */
const LEGACY_RELEASE_READINESS_KEYS = new Set(['enabled', 'readyStatusKey', 'releasesTabVisible']);

function omitLegacyReleaseReadinessKeys(value: unknown): unknown {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !LEGACY_RELEASE_READINESS_KEYS.has(key))
  );
}

/** Поле трекера со ссылкой на merge request. */
const ReleaseReadinessConfigSchema = z.preprocess(
  omitLegacyReleaseReadinessKeys,
  z
    .object({
      mergeRequestFieldId: z.string().min(1).optional(),
    })
    .strict()
);

/** Тело PUT от админки (без revision — выставляет сервер). */
export const TrackerIntegrationPutBodySchema = z
  .object({
    platform: PlatformConfigSchema.optional(),
    releaseReadiness: ReleaseReadinessConfigSchema.optional(),
    statuses: StatusesConfigSchema.optional(),
    testingFlow: TestingFlowConfigSchema.optional(),
    validationThresholds: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

type TrackerIntegrationPutBody = z.infer<typeof TrackerIntegrationPutBodySchema>;

/** Хранимый фрагмент settings.trackerIntegration. */
const TrackerIntegrationStoredSchema = TrackerIntegrationPutBodySchema.extend({
  configRevision: z.number().int().nonnegative(),
}).strict();

export type TrackerIntegrationStored = z.infer<typeof TrackerIntegrationStoredSchema>;

export function parseTrackerIntegrationPutBody(raw: unknown): TrackerIntegrationPutBody {
  const r = TrackerIntegrationPutBodySchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `Invalid tracker integration body: ${r.error.issues.map((i) => i.message).join('; ')}`
    );
  }
  return r.data;
}

export function parseTrackerIntegrationStored(raw: unknown): TrackerIntegrationStored | null {
  const r = TrackerIntegrationStoredSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/** Достаёт объект trackerIntegration из корня settings (JSONB). */
export function extractTrackerIntegrationJson(settingsRoot: unknown): unknown {
  if (settingsRoot === null || settingsRoot === undefined) {
    return undefined;
  }
  if (typeof settingsRoot !== 'object' || Array.isArray(settingsRoot)) {
    return undefined;
  }
  const ti = (settingsRoot as Record<string, unknown>).trackerIntegration;
  if (ti === null || ti === undefined) {
    return undefined;
  }
  return ti;
}

/**
 * Вливает сохранённый конфиг в `settings.trackerIntegration`, не трогая sync и прочие ключи.
 * `patch` — уже валидированный объект с configRevision.
 */
export function mergeOrganizationSettingsTrackerIntegration(
  settingsRoot: unknown,
  patch: TrackerIntegrationStored
): Record<string, unknown> {
  const root =
    settingsRoot !== null && typeof settingsRoot === 'object' && !Array.isArray(settingsRoot)
      ? { ...(settingsRoot as Record<string, unknown>) }
      : {};
  root.trackerIntegration = patch;
  return root;
}

export function isTaskStatus(value: string): value is TaskStatus {
  return value === 'todo' || value === 'in-progress' || value === 'paused' || value === 'done';
}
