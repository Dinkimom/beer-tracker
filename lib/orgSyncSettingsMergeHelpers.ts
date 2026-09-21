import type { OrgSyncSettingsPartial } from './orgSyncSettings';

function extractOrgSyncSettingsJson(settingsRoot: unknown): unknown {
  if (settingsRoot === null || settingsRoot === undefined) {
    return {};
  }
  if (typeof settingsRoot !== 'object') {
    return {};
  }
  const sync = (settingsRoot as Record<string, unknown>).sync;
  if (sync === null || sync === undefined) {
    return {};
  }
  if (typeof sync !== 'object' || Array.isArray(sync)) {
    return {};
  }
  return sync;
}

function cloneSettingsRoot(settingsRoot: unknown): Record<string, unknown> {
  if (settingsRoot !== null && typeof settingsRoot === 'object' && !Array.isArray(settingsRoot)) {
    return { ...(settingsRoot as Record<string, unknown>) };
  }
  return {};
}

function cloneSyncSection(prevRaw: unknown): Record<string, unknown> {
  if (prevRaw !== null && typeof prevRaw === 'object' && !Array.isArray(prevRaw)) {
    return { ...(prevRaw as Record<string, unknown>) };
  }
  return {};
}

function applyDefinedPatchValues(
  target: Record<string, unknown>,
  patch: Record<string, unknown>
): void {
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value !== undefined) {
      target[key] = value;
    }
  }
}

export function mergeOrganizationSettingsSyncPatch(
  settingsRoot: unknown,
  patch: OrgSyncSettingsPartial
): Record<string, unknown> {
  const root = cloneSettingsRoot(settingsRoot);
  const prev = cloneSyncSection(extractOrgSyncSettingsJson(root));
  applyDefinedPatchValues(prev, patch as Record<string, unknown>);
  root.sync = prev;
  return root;
}
