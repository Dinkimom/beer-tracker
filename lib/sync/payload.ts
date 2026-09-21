import type { SyncJobPayload } from './types';

import { z } from 'zod';

const Uuid = z.string().uuid();

const SyncJobPayloadSchema = z.object({
  mode: z.enum(['full_rescan', 'incremental', 'initial_full']),
  organizationId: Uuid,
  requestedByUserId: Uuid.optional(),
});

export function parseSyncJobPayload(data: unknown): SyncJobPayload {
  const r = SyncJobPayloadSchema.safeParse(data);
  if (!r.success) {
    throw new Error(`Invalid sync job payload: ${r.error.message}`);
  }
  return r.data;
}
