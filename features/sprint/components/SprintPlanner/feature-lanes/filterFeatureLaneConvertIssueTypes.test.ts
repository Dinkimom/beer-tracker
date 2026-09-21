import { describe, expect, it } from 'vitest';

import { filterFeatureLaneConvertIssueTypes } from './filterFeatureLaneConvertIssueTypes';

describe('filterFeatureLaneConvertIssueTypes', () => {
  it('оставляет эпик и стори, если они есть в очереди', () => {
    expect(
      filterFeatureLaneConvertIssueTypes([
        { label: 'Задача', value: 'task' },
        { label: 'Эпик', value: 'epic' },
        { label: 'Стори', value: 'story' },
      ])
    ).toEqual([
      { label: 'Эпик', value: 'epic' },
      { label: 'Стори', value: 'story' },
    ]);
  });

  it('возвращает все типы, если эпика и стори нет', () => {
    const options = [
      { label: 'Задача', value: 'task' },
      { label: 'Ошибка', value: 'bug' },
    ];
    expect(filterFeatureLaneConvertIssueTypes(options)).toEqual(options);
  });
});
