import type { PlannerObjectStore } from './plannerObjectStore';

import { getS3Config } from '@/lib/env';

import { S3PlannerObjectStore } from './s3PlannerObjectStore';

let storeOverride: PlannerObjectStore | undefined;
let s3Store: PlannerObjectStore | undefined;

export function getPlannerObjectStore(): PlannerObjectStore {
  if (storeOverride) {
    return storeOverride;
  }
  if (!s3Store) {
    s3Store = new S3PlannerObjectStore(getS3Config());
  }
  return s3Store;
}

/** Best-effort delete; missing keys and network errors leave orphans. */
export async function deletePlannerStoredObject(
  storageKey: string | null | undefined
): Promise<void> {
  if (!storageKey) {
    return;
  }
  try {
    await getPlannerObjectStore().deleteObject(storageKey);
  } catch {
    // Orphans in the bucket are acceptable; the DB row is already gone.
  }
}

/** Inject a fake store in tests. Pass undefined to restore the S3 singleton. */
export function setPlannerObjectStoreForTests(store: PlannerObjectStore | undefined): void {
  storeOverride = store;
}
