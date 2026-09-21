export interface PlannerStoredObject {
  body: Buffer;
  contentType: string;
}

export interface PlannerObjectStore {
  deleteObject(key: string): Promise<void>;
  getObject(key: string): Promise<PlannerStoredObject | null>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
}

/** In-memory store for unit tests (CI must not hit production S3). */
export class MemoryPlannerObjectStore implements PlannerObjectStore {
  readonly objects = new Map<string, PlannerStoredObject>();

  deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  getObject(key: string): Promise<PlannerStoredObject | null> {
    const stored = this.objects.get(key);
    if (!stored) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ body: Buffer.from(stored.body), contentType: stored.contentType });
  }

  putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body: Buffer.from(body), contentType });
    return Promise.resolve();
  }
}
