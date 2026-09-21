import { describe, expect, it } from 'vitest';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';
import { FEATURE_LANE_DRAFT_ROW_PREFIX } from '@/lib/sprints/featureLanesDocument';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  mergeFeatureSwimlaneBoardRows,
  moveFeatureSwimlaneRowOrder,
  rememberFeatureSwimlaneRowOrder,
} from './featureSwimlaneRowOrder';

describe('mergeFeatureSwimlaneBoardRows', () => {
  it('добавляет локальные черновики после строк из задач', () => {
    const projectionRows = [{ id: 'p1', name: 'A', role: 'other' as const }];
    const draftRows = [{ id: `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`, name: 'Draft', role: 'other' as const }];
    expect(
      mergeFeatureSwimlaneBoardRows({ draftRows, orderIds: [], projectionRows }).map((row) => row.id)
    ).toEqual(['p1', `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`]);
  });

  it('держит «Общее» первой строкой даже при сохранённом порядке', () => {
    expect(
      mergeFeatureSwimlaneBoardRows({
        draftRows: [],
        orderIds: ['p1', TEAM_SWIMLANE_ASSIGNEE_ID],
        projectionRows: [
          { id: TEAM_SWIMLANE_ASSIGNEE_ID, name: 'Общее', role: 'other' },
          { id: 'p1', name: 'A', role: 'other' },
        ],
      }).map((row) => row.id)
    ).toEqual([TEAM_SWIMLANE_ASSIGNEE_ID, 'p1']);
  });

  it('сохраняет название черновой строки, если проекция уже знает этот id', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const merged = mergeFeatureSwimlaneBoardRows({
      draftRows: [{ id: draftId, name: 'Моя фича', role: 'other' }],
      orderIds: [],
      projectionRows: [{ id: draftId, name: draftId, role: 'other' }],
    });
    expect(merged).toEqual([{ id: draftId, name: 'Моя фича', role: 'other' }]);
  });

  it('переставляет строки по сохранённому порядку', () => {
    expect(moveFeatureSwimlaneRowOrder(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
  });

  it('не двигает черновик, когда на нём появляются задачи', () => {
    const team = { id: TEAM_SWIMLANE_ASSIGNEE_ID, name: 'Общее', role: 'other' as const };
    const noParent = { id: TASK_GROUP_KEY_NO_PARENT, name: 'Без родителя', role: 'other' as const };
    const featureA = { id: 'p-a', name: 'Фича A', role: 'other' as const };
    const draft = {
      id: `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`,
      name: 'Ааа черновик',
      role: 'other' as const,
    };
    const withoutTasks = mergeFeatureSwimlaneBoardRows({
      draftRows: [draft],
      orderIds: [],
      projectionRows: [team, featureA, noParent],
    });
    expect(withoutTasks.map((row) => row.id)).toEqual([
      TEAM_SWIMLANE_ASSIGNEE_ID,
      'p-a',
      TASK_GROUP_KEY_NO_PARENT,
      draft.id,
    ]);

    const withTasks = mergeFeatureSwimlaneBoardRows({
      draftRows: [draft],
      orderIds: [],
      projectionRows: [team, draft, featureA, noParent],
    });
    expect(withTasks.map((row) => row.id)).toEqual(withoutTasks.map((row) => row.id));
  });

  it('новую фичу дописывает в конец, а не вставляет по алфавиту', () => {
    expect(
      mergeFeatureSwimlaneBoardRows({
        draftRows: [],
        orderIds: [],
        previousOrderIds: [TEAM_SWIMLANE_ASSIGNEE_ID, 'p-z', TASK_GROUP_KEY_NO_PARENT],
        projectionRows: [
          { id: TEAM_SWIMLANE_ASSIGNEE_ID, name: 'Общее', role: 'other' },
          { id: 'p-a', name: 'Фича A', role: 'other' },
          { id: 'p-z', name: 'Фича Z', role: 'other' },
          { id: TASK_GROUP_KEY_NO_PARENT, name: 'Без родителя', role: 'other' },
        ],
      }).map((row) => row.id)
    ).toEqual([TEAM_SWIMLANE_ASSIGNEE_ID, 'p-z', TASK_GROUP_KEY_NO_PARENT, 'p-a']);
  });

  it('вернувшуюся строку ставит на прежнее место, а не в конец', () => {
    expect(
      mergeFeatureSwimlaneBoardRows({
        draftRows: [],
        orderIds: [],
        previousOrderIds: [TEAM_SWIMLANE_ASSIGNEE_ID, 'p-a', 'p-z', TASK_GROUP_KEY_NO_PARENT],
        projectionRows: [
          { id: TEAM_SWIMLANE_ASSIGNEE_ID, name: 'Общее', role: 'other' },
          { id: 'p-a', name: 'Фича A', role: 'other' },
          { id: 'p-z', name: 'Фича Z', role: 'other' },
          { id: TASK_GROUP_KEY_NO_PARENT, name: 'Без родителя', role: 'other' },
        ],
      }).map((row) => row.id)
    ).toEqual([TEAM_SWIMLANE_ASSIGNEE_ID, 'p-a', 'p-z', TASK_GROUP_KEY_NO_PARENT]);
  });
});

describe('rememberFeatureSwimlaneRowOrder', () => {
  it('сохраняет id пропавшей строки, чтобы она могла вернуться на место', () => {
    expect(rememberFeatureSwimlaneRowOrder(['team', 'a', 'b'], ['team', 'b'])).toEqual([
      'team',
      'a',
      'b',
    ]);
  });
});
