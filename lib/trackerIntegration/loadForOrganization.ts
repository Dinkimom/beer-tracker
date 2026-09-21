import { findOrganizationById } from '@/lib/organizations';

import {
  extractTrackerIntegrationJson,
  parseTestingFlowConfigLoose,
  parseTrackerIntegrationStored,
  type TrackerIntegrationStored,
} from './schema';

export async function loadTrackerIntegrationForOrganization(
  organizationId: string
): Promise<TrackerIntegrationStored | null> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return null;
  }
  return parseTrackerIntegrationStored(extractTrackerIntegrationJson(org.settings));
}

/**
 * Конфиг для PATCH в Яндекс.Трекер (исполнители, оценки): сначала полный парс,
 * иначе только testingFlow с мягким парсом — чтобы маппинг полей из админки не терялся.
 */
export async function loadTrackerIntegrationForTrackerPatch(
  organizationId: string
): Promise<TrackerIntegrationStored | null> {
  const org = await findOrganizationById(organizationId);
  if (!org) {
    return null;
  }
  const raw = extractTrackerIntegrationJson(org.settings);
  const full = parseTrackerIntegrationStored(raw);
  if (full) {
    return full;
  }
  const root =
    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  const flow = parseTestingFlowConfigLoose(root?.testingFlow);
  if (!flow) {
    return null;
  }
  return {
    configRevision: 0,
    testingFlow: flow,
  } as TrackerIntegrationStored;
}
