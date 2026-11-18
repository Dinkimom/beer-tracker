import { describe, expect, it } from 'vitest';

import { createDemoFixtureSeed } from './demoFixtureSeed';
import { applyDemoStressVariant } from './demoFixtureStress';

describe('applyDemoStressVariant', () => {
  const base = createDemoFixtureSeed();
  const stress = applyDemoStressVariant(createDemoFixtureSeed());

  it('добавляет людей без аватаров и с длинными именами', () => {
    expect(stress.developers.length).toBe(base.developers.length + 10);
    const added = stress.developers.slice(base.developers.length);
    expect(added.every((person) => !person.avatarUrl)).toBe(true);
    expect(Math.max(...added.map((person) => person.name.length))).toBeGreaterThan(40);
  });

  it('удлиняет названия и добавляет незапланированные задачи, часть без оценок', () => {
    expect(stress.tasks.length).toBe(base.tasks.length + 30);
    expect(stress.tasks.filter((task) => task.type !== 'goal').every((task) => task.name.length > 80)).toBe(true);
    expect(stress.tasks.some((task) => task.storyPoints === undefined)).toBe(true);
  });

  it('карточки на доске стоят у существующих людей и у существующих задач', () => {
    const people = new Set(stress.developers.map((person) => person.id));
    const tasks = new Set(stress.tasks.map((task) => task.id));
    for (const row of stress.positions) {
      expect(people.has(row.assignee_id)).toBe(true);
      expect(tasks.has(row.task_id)).toBe(true);
    }
  });

  it('не трогает обычный сид', () => {
    expect(createDemoFixtureSeed().tasks.length).toBe(base.tasks.length);
  });
});
