export type SyncJobMode = 'full_rescan' | 'incremental' | 'initial_full';

export interface SyncJobPayload {
  mode: SyncJobMode;
  organizationId: string;
  requestedByUserId?: string;
}
