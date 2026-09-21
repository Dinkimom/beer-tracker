import { afterEach, describe, expect, it } from 'vitest';

import { deletePlannerStoredObject, setPlannerObjectStoreForTests } from './getPlannerObjectStore';
import { MemoryPlannerObjectStore } from './plannerObjectStore';

describe('deletePlannerStoredObject', () => {
  afterEach(() => {
    setPlannerObjectStoreForTests(undefined);
  });

  it('deletes the object from the injected store', async () => {
    const store = new MemoryPlannerObjectStore();
    await store.putObject('k1', Buffer.from('hi'), 'text/plain');
    setPlannerObjectStoreForTests(store);

    await deletePlannerStoredObject('k1');
    expect(await store.getObject('k1')).toBeNull();
  });

  it('no-ops on empty keys', async () => {
    const store = new MemoryPlannerObjectStore();
    setPlannerObjectStoreForTests(store);
    await deletePlannerStoredObject(null);
    await deletePlannerStoredObject(undefined);
    await deletePlannerStoredObject('');
    expect(store.objects.size).toBe(0);
  });
});
