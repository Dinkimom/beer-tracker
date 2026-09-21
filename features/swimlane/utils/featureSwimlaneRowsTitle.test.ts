import type { TaskParent } from '@/types';

import { describe, expect, it } from 'vitest';

import { TASK_GROUP_KEY_NO_PARENT } from '@/features/task/constants/taskGroupKeys';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  buildFeatureLaneRowTitleById,
  FEATURE_LANE_DRAFT_ROW_PREFIX,
  mergeFeatureLaneTrackerTypes,
  resolveFeatureLaneRowIssueType,
  resolveFeatureSwimlaneRowTitleParts,
} from './featureSwimlaneRows';

function parent(id: string, key = id, display = id): TaskParent {
  return { display, id, key };
}

const boardLabels = { noParentLabel: 'Без родителя', teamLaneLabel: 'Общее' };

describe('resolveFeatureSwimlaneRowTitleParts', () => {
  it('отделяет ключ от названия и не дублирует ключ в тексте', () => {
    expect(resolveFeatureSwimlaneRowTitleParts(parent('1', 'POG-721', 'Пробитие лички'), '1')).toEqual({
      key: 'POG-721',
      title: 'Пробитие лички',
    });
    expect(
      resolveFeatureSwimlaneRowTitleParts(parent('1', 'POG-721', 'POG-721 · Пробитие лички'), '1')
    ).toEqual({
      key: 'POG-721',
      title: 'Пробитие лички',
    });
  });

  it('для строки без родителя оставляет только подпись', () => {
    expect(resolveFeatureSwimlaneRowTitleParts(null, 'Без родителя')).toEqual({
      key: null,
      title: 'Без родителя',
    });
  });

  it('не показывает ключ локальной черновой строки', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    expect(
      resolveFeatureSwimlaneRowTitleParts(parent(draftId, draftId, 'Новая фича'), draftId)
    ).toEqual({
      key: null,
      title: 'Новая фича',
    });
  });
});

describe('resolveFeatureLaneRowIssueType', () => {
  const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;

  it('не ставит тип служебным строкам', () => {
    expect(
      resolveFeatureLaneRowIssueType({ parent: null, rowId: TEAM_SWIMLANE_ASSIGNEE_ID })
    ).toBeNull();
    expect(
      resolveFeatureLaneRowIssueType({ parent: null, rowId: TASK_GROUP_KEY_NO_PARENT })
    ).toBeNull();
  });

  it('помечает черновую строку как draft', () => {
    expect(
      resolveFeatureLaneRowIssueType({
        parent: parent(draftId, draftId, 'Черновик'),
        rowId: draftId,
      })
    ).toBe('draft');
  });

  it('берёт тип из трекера, иначе из источника родителя', () => {
    expect(
      resolveFeatureLaneRowIssueType({
        parent: parent('1', 'NW-10', 'Фича'),
        parentSource: 'parent',
        rowId: '1',
        trackerTypes: new Map([['NW-10', 'epic']]),
      })
    ).toBe('epic');
    expect(
      resolveFeatureLaneRowIssueType({
        parent: parent('1', 'NW-10', 'Фича'),
        parentSource: 'parent',
        rowId: '1',
      })
    ).toBe('story');
    expect(
      resolveFeatureLaneRowIssueType({
        parent: parent('e1', 'NW-1', 'Эпик'),
        parentSource: 'epic',
        rowId: 'e1',
      })
    ).toBe('epic');
  });

  it('для запиненной строки без parentSource берёт тип по id строки', () => {
    expect(
      resolveFeatureLaneRowIssueType({
        parent: parent('ST-9', 'ST-9', 'Редизайн'),
        rowId: 'ST-9',
        trackerTypes: new Map([['ST-9', 'story']]),
      })
    ).toBe('story');
    expect(
      resolveFeatureLaneRowIssueType({
        parent: parent('EP-4', 'EP-4', 'Онбординг'),
        rowId: 'EP-4',
        trackerTypes: new Map([['EP-4', 'epic']]),
      })
    ).toBe('epic');
  });
});

describe('mergeFeatureLaneTrackerTypes', () => {
  it('дополняет снимок типами задач спринта, не перетирая API', () => {
    expect(
      mergeFeatureLaneTrackerTypes(new Map([['NW-10', 'epic']]), [
        { id: 'NW-10', type: 'story' },
        { id: 'ST-9', type: 'story' },
        { id: 'EP-4', type: 'epic' },
        { id: 'T-1', type: undefined },
      ])
    ).toEqual(
      new Map([
        ['NW-10', 'epic'],
        ['ST-9', 'story'],
        ['EP-4', 'epic'],
      ])
    );
  });
});

describe('buildFeatureLaneRowTitleById', () => {
  it('кладёт иконку типа рядом с ключом и названием', () => {
    const draftId = `${FEATURE_LANE_DRAFT_ROW_PREFIX}1`;
    const titles = buildFeatureLaneRowTitleById(
      [
        { id: TEAM_SWIMLANE_ASSIGNEE_ID, name: 'Общее', role: 'other' },
        { id: 'p1', name: 'NW-10 · Фича', role: 'other' },
        { id: draftId, name: 'Черновик', role: 'other' },
      ],
      new Map([
        [TEAM_SWIMLANE_ASSIGNEE_ID, { parent: null, rowId: TEAM_SWIMLANE_ASSIGNEE_ID }],
        [
          'p1',
          { parent: parent('p1', 'NW-10', 'Фича'), parentSource: 'parent', rowId: 'p1' },
        ],
        [draftId, { isDraft: true, parent: parent(draftId, draftId, 'Черновик'), rowId: draftId }],
      ]),
      boardLabels,
      new Map([['NW-10', 'story']])
    );
    expect(titles.get(TEAM_SWIMLANE_ASSIGNEE_ID)).toEqual({
      issueType: null,
      key: null,
      title: 'Общее',
    });
    expect(titles.get('p1')).toEqual({
      issueType: 'story',
      key: 'NW-10',
      title: 'Фича',
    });
    expect(titles.get(draftId)).toEqual({
      issueType: 'draft',
      key: null,
      title: 'Черновик',
    });
  });

  it('после конвертации драфта в новую стори показывает тип без parentSource', () => {
    const titles = buildFeatureLaneRowTitleById(
      [{ id: 'ST-9', name: 'Редизайн', role: 'other' }],
      new Map([
        ['ST-9', { parent: parent('ST-9', 'ST-9', 'Редизайн'), rowId: 'ST-9' }],
      ]),
      boardLabels,
      mergeFeatureLaneTrackerTypes(undefined, [{ id: 'ST-9', type: 'story' }])
    );
    expect(titles.get('ST-9')).toEqual({
      issueType: 'story',
      key: 'ST-9',
      title: 'Редизайн',
    });
  });
});
