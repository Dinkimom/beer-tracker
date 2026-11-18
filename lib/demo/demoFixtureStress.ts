import type { DemoFixtureState } from './demoFixtureSeed';
import type { Developer, Task } from '@/types';

import { DEMO_SPRINT_ID } from './demoIds';

/**
 * Стресс-вариант демо (`/demo/planner?fixture=stress`): те же экраны на неудобных данных — очень длинные
 * названия задач, фичи, целей и людей, люди без аватаров, много незапланированных задач, задачи без оценок.
 * Нужен аудиту интерфейса: на аккуратной фикстуре обрезка и переполнение не видны.
 */
export type DemoFixtureVariant = 'default' | 'stress';

const LONG_TASK_TAIL =
  ' — including retries, partial refunds, idempotency keys, audit trail and a migration of historical records';

const STRESS_PEOPLE: Array<Pick<Developer, 'name' | 'roleTitle'>> = [
  { name: 'Maximilian Alexander von Hohenzollern-Sigmaringen', roleTitle: 'Principal Backend Engineer' },
  { name: 'Anastasia Konstantinovna Rimskaya-Korsakova', roleTitle: 'Senior QA Automation Engineer' },
  { name: 'Bartholomew Fitzgerald-Worthington III', roleTitle: 'Staff Frontend Engineer' },
  { name: 'Guadalupe Esperanza Montserrat de la Cruz', roleTitle: 'Mobile Engineer' },
  { name: 'Oluwaseun Adebayo-Ogunleye', roleTitle: 'Data Engineer' },
  { name: 'Wolfgang Amadeus Kirchenbauer', roleTitle: 'Site Reliability Engineer' },
  { name: 'Xiaoling Zhang-Montgomery', roleTitle: 'Product Designer' },
  { name: 'Jean-Baptiste Emmanuel Zorg', roleTitle: 'Backend Engineer' },
  { name: 'Siobhan Ní Bhriain-McAllister', roleTitle: 'QA Engineer' },
  { name: 'Rumpelstiltskin Q. Featherstonehaugh', roleTitle: 'Engineering Manager' },
];

function stressPeople(): Developer[] {
  return STRESS_PEOPLE.map((person, index) => ({
    email: `stress-${index}@demo.local`,
    id: `demo-stress-${index}`,
    name: person.name,
    platforms: ['back'],
    role: person.roleTitle?.includes('QA') ? 'tester' : 'developer',
    roleTitle: person.roleTitle,
  }));
}

/** Незапланированные задачи с длинными названиями; каждая третья — без оценок. */
function stressTasks(people: Developer[], template: Task): Task[] {
  return Array.from({ length: 30 }, (_, index) => {
    const person = people[index % people.length];
    const estimated = index % 3 !== 0;
    return {
      ...template,
      assignee: person.id,
      assigneeName: person.name,
      id: `DEMO-${300 + index}`,
      name: `Stress task ${index + 1}: reconcile settlement reports between the payment provider and the ledger${LONG_TASK_TAIL}`,
      originalStatus: 'open',
      originalStatusDisplay: 'Open',
      parent: undefined,
      qaEngineer: undefined,
      qaEngineerName: undefined,
      status: 'todo',
      statusTypeKey: 'new',
      storyPoints: estimated ? (index % 5) + 1 : undefined,
      team: 'Back',
      testPoints: estimated ? index % 3 : undefined,
    };
  });
}

/** Применяет стресс-вариант к свежему сиду (мутирует и возвращает его). */
export function applyDemoStressVariant(state: DemoFixtureState): DemoFixtureState {
  const people = stressPeople();
  const longParent = {
    display: 'Checkout redesign: one payment experience across web, iOS and Android with promo codes and saved cards',
    id: 'DEMO-10',
    key: 'DEMO-10',
  };
  state.tasks = state.tasks.map((task) =>
    task.type === 'goal'
      ? task
      : {
          ...task,
          name: `${task.name}${LONG_TASK_TAIL}`,
          parent: task.parent ? longParent : task.parent,
        }
  );
  const extra = stressTasks(people, state.tasks[0]);
  state.tasks.push(...extra);
  state.developers.push(...people);
  // Половина новых людей — с карточкой на доске: длинное имя в строке свимлейна и в заголовке карточки.
  state.positions.push(
    ...extra.slice(0, people.length / 2).map((task, index) => ({
      assignee_id: task.assignee!,
      duration: 3 + (index % 4) * 3,
      start_day: index % 3,
      start_part: 0,
      task_id: task.id,
    }))
  );
  state.backlogTasks = state.backlogTasks.map((task) => ({ ...task, name: `${task.name}${LONG_TASK_TAIL}` }));
  for (const items of Object.values(state.goals)) {
    for (const item of items) item.text = `${item.text}: verified on production traffic for a full week, with rollback plan`;
  }
  state.sprints = state.sprints.map((sprint) =>
    sprint.id === DEMO_SPRINT_ID ? { ...sprint, name: `${sprint.name} and the extremely long sprint name` } : sprint
  );
  return state;
}
