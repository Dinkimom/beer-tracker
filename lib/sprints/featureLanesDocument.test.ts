import { describe, expect, it } from 'vitest';

import {
  appendFeatureLaneDraftRow,
  emptyFeatureLanesDocument,
  isFeatureLaneDraftRowId,
  parseFeatureLanesDocument,
  pinFeatureLaneTrackerRow,
  renameFeatureLaneDraftRow,
  replaceFeatureLaneDraftRow,
  mergePreservedFeatureLaneIssueKeys,
  setFeatureLaneDraftIssueParent,
} from './featureLanesDocument';

describe('isFeatureLaneDraftRowId', () => {
  it('принимает только префикс локальной строки фичи', () => {
    expect(isFeatureLaneDraftRowId('feature-draft:1')).toBe(true);
    expect(isFeatureLaneDraftRowId('parent-1')).toBe(false);
  });
});

describe('parseFeatureLanesDocument', () => {
  it('возвращает пустой документ на мусоре', () => {
    expect(parseFeatureLanesDocument(null)).toEqual(emptyFeatureLanesDocument());
    expect(parseFeatureLanesDocument('nope')).toEqual(emptyFeatureLanesDocument());
  });

  it('оставляет только валидные черновые строки и списки id', () => {
    expect(
      parseFeatureLanesDocument({
        draftRows: [
          { id: 'feature-draft:1', name: '  Редизайн  ' },
          { id: 'ST-1', name: 'Tracker' },
          { id: 'feature-draft:2', name: '' },
          { name: 'без id' },
        ],
        hiddenIds: ['feature-draft:1', 12, ''],
        orderIds: ['p1', 'feature-draft:1'],
      })
    ).toEqual({
      draftRows: [
        { id: 'feature-draft:1', name: 'Редизайн' },
        { id: 'ST-1', name: 'Tracker' },
      ],
      hiddenIds: ['feature-draft:1'],
      orderIds: ['p1', 'feature-draft:1'],
    });
  });

  it('читает ключи задач на черновой строке', () => {
    expect(
      parseFeatureLanesDocument({
        draftRows: [{ id: 'feature-draft:1', issueKeys: [' BT-1 ', '', 'BT-2'], name: 'Пупи' }],
        hiddenIds: [],
        orderIds: [],
      })
    ).toEqual({
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1', 'BT-2'], name: 'Пупи' }],
      hiddenIds: [],
      orderIds: [],
    });
  });
});

describe('renameFeatureLaneDraftRow', () => {
  it('меняет имя только указанной строки', () => {
    const current = {
      draftRows: [
        { id: 'feature-draft:1', name: 'Старое' },
        { id: 'feature-draft:2', name: 'Другая' },
      ],
      hiddenIds: [],
      orderIds: ['feature-draft:1'],
    };
    expect(renameFeatureLaneDraftRow(current, 'feature-draft:1', '  Новое  ')).toEqual({
      ...current,
      draftRows: [
        { id: 'feature-draft:1', name: 'Новое' },
        { id: 'feature-draft:2', name: 'Другая' },
      ],
    });
  });
});

describe('replaceFeatureLaneDraftRow', () => {
  it('подменяет id черновика на ключ Трекера', () => {
    const current = {
      draftRows: [{ id: 'feature-draft:1', name: 'Редизайн' }],
      hiddenIds: ['feature-draft:1'],
      orderIds: ['p1', 'feature-draft:1'],
    };
    expect(
      replaceFeatureLaneDraftRow(current, 'feature-draft:1', { id: 'ST-9', name: 'Редизайн' })
    ).toEqual({
      draftRows: [{ id: 'ST-9', name: 'Редизайн' }],
      hiddenIds: ['ST-9'],
      orderIds: ['p1', 'ST-9'],
    });
  });
});

describe('pinFeatureLaneTrackerRow', () => {
  it('добавляет строку Трекера, если её ещё нет', () => {
    const current = {
      draftRows: [{ id: 'feature-draft:1', name: 'Черновик' }],
      hiddenIds: [],
      orderIds: ['feature-draft:1'],
    };
    expect(pinFeatureLaneTrackerRow(current, { id: '  ST-9  ', name: '  Редизайн  ' })).toEqual({
      ...current,
      draftRows: [
        { id: 'feature-draft:1', name: 'Черновик' },
        { id: 'ST-9', name: 'Редизайн' },
      ],
    });
  });

  it('не дублирует уже закреплённую строку и не принимает черновик', () => {
    const current = {
      draftRows: [{ id: 'ST-9', name: 'Редизайн' }],
      hiddenIds: [],
      orderIds: [],
    };
    expect(pinFeatureLaneTrackerRow(current, { id: 'ST-9', name: 'Другое' })).toBe(current);
    expect(pinFeatureLaneTrackerRow(current, { id: 'feature-draft:1', name: 'Черновик' })).toBe(
      current
    );
  });
});

describe('appendFeatureLaneDraftRow', () => {
  it('добавляет черновик в конец порядка', () => {
    const current = {
      draftRows: [{ id: 'feature-draft:1', name: 'Уже есть' }],
      hiddenIds: ['hidden'],
      orderIds: ['feature-draft:1'],
    };
    expect(appendFeatureLaneDraftRow(current, { id: '  feature-draft:2  ', name: '  Новая  ' })).toEqual({
      draftRows: [
        { id: 'feature-draft:1', name: 'Уже есть' },
        { id: 'feature-draft:2', name: 'Новая' },
      ],
      hiddenIds: ['hidden'],
      orderIds: ['feature-draft:1', 'feature-draft:2'],
    });
  });

  it('не дублирует строку и не принимает ключ Трекера', () => {
    const current = {
      draftRows: [{ id: 'feature-draft:1', name: 'Черновик' }],
      hiddenIds: [],
      orderIds: ['feature-draft:1'],
    };
    expect(appendFeatureLaneDraftRow(current, { id: 'feature-draft:1', name: 'Другое' })).toBe(current);
    expect(appendFeatureLaneDraftRow(current, { id: 'ST-9', name: 'Стори' })).toBe(current);
  });
});

describe('setFeatureLaneDraftIssueParent', () => {
  const current = {
    draftRows: [
      { id: 'feature-draft:1', name: 'Пупи' },
      { id: 'feature-draft:2', name: 'Другая' },
    ],
    hiddenIds: [],
    orderIds: ['feature-draft:1'],
  };

  it('пишет ключ задачи в выбранную черновую строку', () => {
    expect(setFeatureLaneDraftIssueParent(current, 'BT-1', 'feature-draft:1')).toEqual({
      ...current,
      draftRows: [
        { id: 'feature-draft:1', issueKeys: ['BT-1'], name: 'Пупи' },
        { id: 'feature-draft:2', name: 'Другая' },
      ],
    });
  });

  it('переносит задачу на другую строку и явно очищает предыдущую', () => {
    const withTask = setFeatureLaneDraftIssueParent(current, 'BT-1', 'feature-draft:1');
    expect(setFeatureLaneDraftIssueParent(withTask, 'BT-1', 'feature-draft:2')).toEqual({
      ...current,
      draftRows: [
        { id: 'feature-draft:1', issueKeys: [], name: 'Пупи' },
        { id: 'feature-draft:2', issueKeys: ['BT-1'], name: 'Другая' },
      ],
    });
  });

  it('снимает привязку без ключа Трекера', () => {
    const withTask = setFeatureLaneDraftIssueParent(current, 'BT-1', 'feature-draft:1');
    expect(setFeatureLaneDraftIssueParent(withTask, 'BT-1', null)).toEqual({
      ...current,
      draftRows: [
        { id: 'feature-draft:1', issueKeys: [], name: 'Пупи' },
        { id: 'feature-draft:2', name: 'Другая' },
      ],
    });
  });
});

describe('mergePreservedFeatureLaneIssueKeys', () => {
  it('подставляет сохранённые ключи, если клиент их не прислал', () => {
    const existing = {
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1'], name: 'Пупи' }],
      hiddenIds: [],
      orderIds: [],
    };
    const incoming = {
      draftRows: [{ id: 'feature-draft:1', name: 'Пупи' }],
      hiddenIds: [],
      orderIds: ['feature-draft:1'],
    };
    expect(mergePreservedFeatureLaneIssueKeys(existing, incoming)).toEqual({
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1'], name: 'Пупи' }],
      hiddenIds: [],
      orderIds: ['feature-draft:1'],
    });
  });

  it('уважает явный пустой список ключей', () => {
    const existing = {
      draftRows: [{ id: 'feature-draft:1', issueKeys: ['BT-1'], name: 'Пупи' }],
      hiddenIds: [],
      orderIds: [],
    };
    const incoming = {
      draftRows: [{ id: 'feature-draft:1', issueKeys: [], name: 'Пупи' }],
      hiddenIds: [],
      orderIds: [],
    };
    expect(mergePreservedFeatureLaneIssueKeys(existing, incoming)).toEqual(incoming);
  });
});
