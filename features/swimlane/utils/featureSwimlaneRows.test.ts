import type { Comment, Task, TaskParent, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  applyFeatureLaneBacklogDrop,
  applyFeatureLanePositionDrop,
  buildFeatureSwimlaneProjection,
  collectFeatureLaneTaskIdsWaitingForDrafts,
  FEATURE_LANE_DRAFT_ROW_PREFIX,
  formatFeatureSwimlaneRowName,
  isFeatureLaneActionableRowId,
  mergeFeatureLaneDraftRowMeta,
  omitTaskPositionsByIds,
  overlayFeatureLaneDraftParents,
  projectCommentsOntoFeatureRows,
  projectTaskPositionsToFeatureRows,
  resolveAnnotationPersistFromLaneDraft,
  resolveFeatureLaneDropAssignee,
  resolveFeatureRowParentChange,
  resolveTaskFeatureRowId,
  restoreFeatureLanePositionAssignee,
} from './featureSwimlaneRows';

function parent(id: string, key = id, display = id): TaskParent {
  return { display, id, key };
}

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    link: '',
    name: partial.name ?? partial.id,
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

function position(taskId: string, assignee: string): TaskPosition {
  return { assignee, duration: 3, startDay: 0, startPart: 0, taskId };
}

const boardLabels = { noParentLabel: 'Без родителя', teamLaneLabel: 'Общее' };

describe('isFeatureLaneActionableRowId', () => {
  it('скрывает «Общее» и «Без родителя»', () => {
    expect(isFeatureLaneActionableRowId('ST-9')).toBe(true);
    expect(isFeatureLaneActionableRowId(`${FEATURE_LANE_DRAFT_ROW_PREFIX}1`)).toBe(true);
    expect(isFeatureLaneActionableRowId(TEAM_SWIMLANE_ASSIGNEE_ID)).toBe(false);
    expect(isFeatureLaneActionableRowId(TASK_GROUP_KEY_NO_PARENT)).toBe(false);
  });
});

describe('resolveTaskFeatureRowId', () => {
  it('берёт parent, иначе epic; без родителя — «Общее» только для командной строки', () => {
    expect(resolveTaskFeatureRowId(task({ id: 'T-1', parent: parent('P-1') }))).toBe('P-1');
    expect(resolveTaskFeatureRowId(task({ id: 'T-2', epic: parent('E-1') }))).toBe('E-1');
    expect(resolveTaskFeatureRowId(task({ assignee: 'dev-1', id: 'T-3' }))).toBe(
      TASK_GROUP_KEY_NO_PARENT
    );
    expect(
      resolveTaskFeatureRowId(task({ assignee: TEAM_SWIMLANE_ASSIGNEE_ID, id: 'T-4' }))
    ).toBe(TEAM_SWIMLANE_ASSIGNEE_ID);
  });

  it('группирует по ключу Трекера, даже если parent.id — внутренний id', () => {
    expect(
      resolveTaskFeatureRowId(task({ id: 'T-1', parent: parent('10026', 'ST-9', 'Редизайн') }))
    ).toBe('ST-9');
  });
});

describe('overlayFeatureLaneDraftParents', () => {
  it('навешивает черновик на задачу из документа и не трогает трекерного родителя', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const overlaid = overlayFeatureLaneDraftParents(
      [
        task({ id: 'BT-1' }),
        task({ id: 'BT-2', parent: parent('ST-9') }),
      ],
      {
        draftRows: [{ id: draftId, issueKeys: ['BT-1', 'BT-2'], name: 'Пупи' }],
        hiddenIds: [],
        orderIds: [],
      }
    );
    expect(overlaid[0]?.parent).toEqual({ display: 'Пупи', id: draftId, key: draftId });
    expect(overlaid[1]?.parent).toEqual(parent('ST-9'));
  });

  it('не возвращает черновик, если ключ уже сняли', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const overlaid = overlayFeatureLaneDraftParents(
      [task({ id: 'BT-1' })],
      {
        draftRows: [{ id: draftId, issueKeys: [], name: 'Пупи' }],
        hiddenIds: [],
        orderIds: [],
      }
    );
    expect(overlaid[0]?.parent).toBeUndefined();
  });
});

describe('collectFeatureLaneTaskIdsWaitingForDrafts', () => {
  it('hides parentless tasks until the draft document is loaded', () => {
    const parentless = task({ id: 'BT-1' });
    const withParent = task({ id: 'BT-2', parent: parent('ST-9') });
    expect(collectFeatureLaneTaskIdsWaitingForDrafts([parentless, withParent], false)).toEqual(
      new Set(['BT-1'])
    );
    expect(collectFeatureLaneTaskIdsWaitingForDrafts([parentless, withParent], true).size).toBe(0);
  });
});

describe('omitTaskPositionsByIds', () => {
  it('drops waiting cards so arrows do not anchor to a missing DOM node', () => {
    const positions = new Map<string, TaskPosition>([
      ['BT-1', position('BT-1', TASK_GROUP_KEY_NO_PARENT)],
      ['BT-2', position('BT-2', 'ST-9')],
    ]);
    const next = omitTaskPositionsByIds(positions, new Set(['BT-1']));
    expect([...next.keys()]).toEqual(['BT-2']);
    expect(omitTaskPositionsByIds(positions, new Set())).toBe(positions);
  });
});

describe('formatFeatureSwimlaneRowName', () => {
  it('склеивает ключ и название, если ключа ещё нет в display', () => {
    expect(formatFeatureSwimlaneRowName(parent('1', 'NW-10', 'Редизайн услуг'), '1')).toBe(
      'NW-10 · Редизайн услуг'
    );
    expect(formatFeatureSwimlaneRowName(parent('1', 'NW-10', 'NW-10 Редизайн'), '1')).toBe(
      'NW-10 Редизайн'
    );
    expect(
      formatFeatureSwimlaneRowName(
        parent(`${FEATURE_LANE_DRAFT_ROW_PREFIX}1`, `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`, 'Новая фича'),
        'fallback'
      )
    ).toBe('Новая фича');
  });
});

describe('buildFeatureSwimlaneProjection', () => {
  it('держит «Общее» сверху, а задачи без родителя — в «Без родителя»', () => {
    const projection = buildFeatureSwimlaneProjection(
      [
        task({ id: 'T-1', parent: parent('p1', 'NW-1', 'Фича B') }),
        task({ id: 'T-2', parent: parent('p2', 'NW-2', 'Фича A') }),
        task({ assignee: 'dev-1', id: 'T-3' }),
        task({ assignee: TEAM_SWIMLANE_ASSIGNEE_ID, id: 'T-4' }),
        task({ id: 'note-1', isLocalTask: true, name: 'заметка' }),
      ],
      boardLabels
    );

    expect(projection.rows.map((row) => row.id)).toEqual([
      TEAM_SWIMLANE_ASSIGNEE_ID,
      'NW-2',
      'NW-1',
      TASK_GROUP_KEY_NO_PARENT,
    ]);
    expect(projection.rows[0]?.name).toBe('Общее');
    expect(projection.rows[1]?.name).toBe('NW-2 · Фича A');
    expect(projection.rows[3]?.name).toBe('Без родителя');
    expect(projection.tasksByRowId.get('NW-1')?.map((item) => item.id)).toEqual(['T-1']);
    expect(projection.tasksByRowId.get(TEAM_SWIMLANE_ASSIGNEE_ID)?.map((item) => item.id)).toEqual([
      'T-4',
    ]);
    expect(projection.tasksByRowId.get(TASK_GROUP_KEY_NO_PARENT)?.map((item) => item.id)).toEqual([
      'T-3',
    ]);
    expect(projection.rowMetaById.get('NW-2')?.parent?.key).toBe('NW-2');
    expect(projection.rowMetaById.get('NW-2')?.parentSource).toBe('parent');
  });

  it('помечает строку из epic как эпик', () => {
    const projection = buildFeatureSwimlaneProjection(
      [task({ epic: parent('e1', 'NW-E', 'Эпик'), id: 'T-1' })],
      boardLabels
    );
    expect(projection.rowMetaById.get('NW-E')?.parentSource).toBe('epic');
  });

  it('показывает «Общее» и «Без родителя», даже если в спринте нет таких задач', () => {
    const projection = buildFeatureSwimlaneProjection([], boardLabels);
    expect(projection.rows).toEqual([
      { id: TEAM_SWIMLANE_ASSIGNEE_ID, name: 'Общее', role: 'other' },
      { id: TASK_GROUP_KEY_NO_PARENT, name: 'Без родителя', role: 'other' },
    ]);
  });
});

describe('projectTaskPositionsToFeatureRows', () => {
  it('подменяет assignee на id родительской строки', () => {
    const tasksMap = new Map<string, Task>([
      ['T-1', task({ id: 'T-1', parent: parent('p1') })],
      ['T-2', task({ id: 'T-2' })],
    ]);
    const positions = new Map<string, TaskPosition>([
      ['T-1', position('T-1', 'dev-1')],
      ['T-2', position('T-2', 'dev-2')],
    ]);

    const projected = projectTaskPositionsToFeatureRows(positions, tasksMap);
    expect(projected.get('T-1')?.assignee).toBe('p1');
    expect(projected.get('T-2')?.assignee).toBe(TASK_GROUP_KEY_NO_PARENT);
    expect(positions.get('T-1')?.assignee).toBe('dev-1');
  });

  it('оставляет карточку с командной позиции в «Общем»', () => {
    const tasksMap = new Map<string, Task>([
      ['T-1', task({ id: 'T-1' })],
    ]);
    const positions = new Map<string, TaskPosition>([
      ['T-1', position('T-1', TEAM_SWIMLANE_ASSIGNEE_ID)],
    ]);
    expect(projectTaskPositionsToFeatureRows(positions, tasksMap).get('T-1')?.assignee).toBe(
      TEAM_SWIMLANE_ASSIGNEE_ID
    );
  });
});

describe('restoreFeatureLanePositionAssignee', () => {
  it('возвращает исполнителя из сохранённой позиции, не из строки фичи', () => {
    const restored = restoreFeatureLanePositionAssignee(
      position('T-1', 'p1'),
      position('T-1', 'dev-1'),
      task({ assignee: 'dev-other', id: 'T-1' })
    );
    expect(restored.assignee).toBe('dev-1');
  });
});

describe('mergeFeatureLaneDraftRowMeta', () => {
  it('добавляет метаданные пустой черновой строки', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const merged = mergeFeatureLaneDraftRowMeta(new Map(), [{ id: draftId, name: 'Пупи' }]);
    expect(merged.get(draftId)).toEqual({
      isDraft: true,
      parent: parent(draftId, draftId, 'Пупи'),
      rowId: draftId,
    });
  });
});

describe('resolveFeatureRowParentChange', () => {
  const rowMetaById = new Map([
    ['p1', { parent: parent('p1', 'NW-1', 'Фича'), rowId: 'p1' }],
    [TEAM_SWIMLANE_ASSIGNEE_ID, { parent: null, rowId: TEAM_SWIMLANE_ASSIGNEE_ID }],
  ]);

  it('не меняет родителя при дропе в ту же строку', () => {
    expect(
      resolveFeatureRowParentChange('p1', task({ id: 'T-1', parent: parent('p1') }), rowMetaById)
    ).toBeUndefined();
  });

  it('снимает родителя при переносе в «Без родителя»', () => {
    expect(
      resolveFeatureRowParentChange(
        TASK_GROUP_KEY_NO_PARENT,
        task({ id: 'T-1', parent: parent('p1') }),
        rowMetaById
      )
    ).toBeNull();
  });

  it('снимает родителя при переносе в «Общее»', () => {
    expect(
      resolveFeatureRowParentChange(
        TEAM_SWIMLANE_ASSIGNEE_ID,
        task({ id: 'T-1', parent: parent('p1') }),
        rowMetaById
      )
    ).toBeNull();
  });

  it('возвращает нового родителя при переносе в другую фичу', () => {
    expect(resolveFeatureRowParentChange('p1', task({ id: 'T-1' }), rowMetaById)).toEqual(
      parent('p1', 'NW-1', 'Фича')
    );
  });

  it('ставит локального родителя при переносе на черновую строку', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const draftParent = parent(draftId, draftId, 'Draft');
    expect(
      resolveFeatureRowParentChange(
        draftId,
        task({ id: 'T-1', parent: parent('p1') }),
        new Map([[draftId, { isDraft: true, parent: draftParent, rowId: draftId }]])
      )
    ).toEqual(draftParent);
  });

  it('синтезирует родителя драфта, даже если строки нет в метаданных', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    expect(resolveFeatureRowParentChange(draftId, task({ id: 'T-1' }), new Map())).toEqual(
      parent(draftId, draftId, draftId)
    );
  });

  it('снимает родителя-черновик при переносе в «Без родителя»', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    expect(
      resolveFeatureRowParentChange(
        TASK_GROUP_KEY_NO_PARENT,
        task({ id: 'T-1', parent: parent(draftId, draftId, 'Draft') }),
        new Map()
      )
    ).toBeNull();
  });
});

describe('applyFeatureLanePositionDrop', () => {
  it('сохраняет исполнителя и меняет родителя при переносе в другую фичу', () => {
    const onPositionUpdate = vi.fn();
    const onParentChange = vi.fn();
    applyFeatureLanePositionDrop({
      droppedRowId: 'p1',
      existing: position('T-1', 'dev-1'),
      incoming: { ...position('T-1', 'p1'), startDay: 2 },
      rowMetaById: new Map([['p1', { parent: parent('p1', 'NW-1', 'Фича'), rowId: 'p1' }]]),
      task: task({ id: 'T-1' }),
      taskId: 'T-1',
      onParentChange,
      onPositionUpdate,
    });
    expect(onPositionUpdate).toHaveBeenCalledWith(
      'T-1',
      expect.objectContaining({ assignee: 'dev-1', startDay: 2 }),
      expect.objectContaining({
        sideEffects: expect.objectContaining({
          taskParents: expect.any(Map),
        }),
      })
    );
    expect(onParentChange).toHaveBeenCalledWith('T-1', parent('p1', 'NW-1', 'Фича'));
  });

  it('ставит локального родителя при переносе на черновую строку', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const draftParent = parent(draftId, draftId, 'Draft');
    const onParentChange = vi.fn();
    applyFeatureLanePositionDrop({
      droppedRowId: draftId,
      existing: position('T-1', 'dev-1'),
      incoming: position('T-1', draftId),
      rowMetaById: new Map([[draftId, { isDraft: true, parent: draftParent, rowId: draftId }]]),
      task: task({ id: 'T-1' }),
      taskId: 'T-1',
      onParentChange,
      onPositionUpdate: vi.fn(),
    });
    expect(onParentChange).toHaveBeenCalledWith('T-1', draftParent);
  });

  it('снимает эпик/стори и ставит драфт при переносе со строки Трекера', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const draftParent = parent(draftId, draftId, 'Draft');
    const onParentChange = vi.fn();
    applyFeatureLanePositionDrop({
      droppedRowId: draftId,
      existing: position('T-1', 'dev-1'),
      incoming: position('T-1', draftId),
      rowMetaById: new Map([
        ['ST-9', { parent: parent('ST-9', 'ST-9', 'Стори'), rowId: 'ST-9' }],
        [draftId, { isDraft: true, parent: draftParent, rowId: draftId }],
      ]),
      task: task({ id: 'T-1', parent: parent('ST-9', 'ST-9', 'Стори') }),
      taskId: 'T-1',
      onParentChange,
      onPositionUpdate: vi.fn(),
    });
    expect(onParentChange).toHaveBeenCalledWith('T-1', draftParent);
  });

  it('переносит карточку на пустую черновую строку без метаданных', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const onParentChange = vi.fn();
    applyFeatureLanePositionDrop({
      droppedRowId: draftId,
      existing: position('T-1', 'dev-1'),
      incoming: position('T-1', draftId),
      rowMetaById: new Map(),
      task: task({ id: 'T-1' }),
      taskId: 'T-1',
      onParentChange,
      onPositionUpdate: vi.fn(),
    });
    expect(onParentChange).toHaveBeenCalledWith(
      'T-1',
      parent(draftId, draftId, draftId)
    );
  });
});

describe('applyFeatureLaneBacklogDrop', () => {
  it('не кладёт карточку без исполнителя', () => {
    const onAssigneeRequired = vi.fn();
    const onBacklogTaskDrop = vi.fn();
    applyFeatureLaneBacklogDrop({
      day: 1,
      droppedRowId: 'p1',
      part: 0,
      rowMetaById: new Map([['p1', { parent: parent('p1'), rowId: 'p1' }]]),
      task: task({ id: 'T-1' }),
      taskId: 'T-1',
      onAssigneeRequired,
      onBacklogTaskDrop,
      onParentChange: vi.fn(),
    });
    expect(onAssigneeRequired).toHaveBeenCalled();
    expect(onBacklogTaskDrop).not.toHaveBeenCalled();
  });
});

describe('resolveFeatureLaneDropAssignee', () => {
  it('берёт исполнителя с карточки, а не id строки фичи', () => {
    expect(resolveFeatureLaneDropAssignee(task({ assignee: 'dev-1', id: 'T-1' }))).toBe('dev-1');
    expect(resolveFeatureLaneDropAssignee(task({ id: 'T-1' }))).toBeNull();
  });
});

describe('projectCommentsOntoFeatureRows', () => {
  it('оставляет заметку из «Общего» в «Общем», а чужую без родителя — в «Без родителя»', () => {
    const comments: Comment[] = [
      {
        assigneeId: TEAM_SWIMLANE_ASSIGNEE_ID,
        day: 0,
        height: 1,
        id: 'c-team',
        part: 0,
        text: 'team',
        width: 2,
        x: 0,
        y: 0,
      },
      {
        assigneeId: 'dev-1',
        day: 0,
        height: 1,
        id: 'c-person',
        part: 0,
        text: 'person',
        width: 2,
        x: 0,
        y: 0,
      },
    ];
    const projected = projectCommentsOntoFeatureRows(comments);
    expect(projected[0]?.assigneeId).toBe(TEAM_SWIMLANE_ASSIGNEE_ID);
    expect(projected[0]?.rowAssigneeId).toBe(TEAM_SWIMLANE_ASSIGNEE_ID);
    expect(projected[1]?.assigneeId).toBe('dev-1');
    expect(projected[1]?.rowAssigneeId).toBe(TASK_GROUP_KEY_NO_PARENT);
  });

  it('кладёт заметку на строку драфта по локальному родителю', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const comments: Comment[] = [
      {
        assigneeId: 'dev-1',
        day: 0,
        height: 1,
        id: 'c1',
        parent: parent(draftId, draftId, 'Draft'),
        part: 0,
        text: 'note',
        width: 2,
        x: 0,
        y: 0,
      },
    ];
    const projected = projectCommentsOntoFeatureRows(comments)[0];
    expect(projected?.assigneeId).toBe('dev-1');
    expect(projected?.rowAssigneeId).toBe(draftId);
  });

  it('кладёт заметку на ключ стори, даже если parent.id из Трекера другой', () => {
    const comments: Comment[] = [
      {
        assigneeId: 'dev-1',
        day: 0,
        height: 1,
        id: 'c1',
        parent: parent('10026', 'ST-9', 'Редизайн'),
        part: 0,
        text: 'note',
        width: 2,
        x: 0,
        y: 0,
      },
    ];
    expect(projectCommentsOntoFeatureRows(comments)[0]?.rowAssigneeId).toBe('ST-9');
  });
});

describe('resolveAnnotationPersistFromLaneDraft', () => {
  it('берёт выбранного человека и оставляет родителя драфта', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    expect(
      resolveAnnotationPersistFromLaneDraft(
        {
          assignee: 'dev-1',
          parent: parent(draftId, draftId, 'Черновик'),
        },
        draftId
      )
    ).toEqual({
      assigneeId: 'dev-1',
      parent: parent(draftId, draftId, 'Черновик'),
    });
  });
});
