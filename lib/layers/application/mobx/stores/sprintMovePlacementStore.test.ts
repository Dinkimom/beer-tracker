import { describe, expect, it } from 'vitest';

import { SprintMovePlacementStore } from './sprintMovePlacementStore';

const session = {
  kind: 'task' as const,
  sourceLinkIds: ['link-1'],
  sourcePositionDuration: 3,
  sourceSprintId: 1,
  targetSprintId: 2,
  targetSprintName: 'Sprint 2',
  task: { id: 'PROJ-1', link: '', name: 'Task', team: 'Web' as const },
};

describe('SprintMovePlacementStore', () => {
  it('новая сессия начинается без черновика и сохранения', () => {
    const store = new SprintMovePlacementStore();
    store.start(session);
    store.markStaged();
    store.setSaving(true);

    store.start({ ...session, targetSprintId: 3 });
    expect(store.session?.targetSprintId).toBe(3);
    expect(store.staged).toBe(false);
    expect(store.saving).toBe(false);
  });

  it('finish сбрасывает сессию целиком', () => {
    const store = new SprintMovePlacementStore();
    store.start(session);
    store.markStaged();
    store.setSaving(true);

    store.finish();
    expect(store.session).toBeNull();
    expect(store.staged).toBe(false);
    expect(store.saving).toBe(false);
  });
});
