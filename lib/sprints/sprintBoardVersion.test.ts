import { describe, expect, it } from 'vitest';

import { boardVersionWarnings, sprintBoardVersion } from './sprintBoardVersion';

const card = { assigneeId: 'staff:a', duration: 2, isQa: false, startDay: 1, startPart: 0, taskId: 'RND-1' };
const other = { ...card, taskId: 'RND-2' };

describe('версия раскладки спринта', () => {
  it('не зависит от порядка карточек', () => {
    expect(sprintBoardVersion([card, other])).toBe(sprintBoardVersion([other, card]));
  });

  it('меняется при сдвиге, смене исполнителя, разбиении, добавлении и удалении карточки', () => {
    const base = sprintBoardVersion([card, other]);
    expect(sprintBoardVersion([{ ...card, startDay: 2 }, other])).not.toBe(base);
    expect(sprintBoardVersion([{ ...card, assigneeId: 'staff:b' }, other])).not.toBe(base);
    expect(
      sprintBoardVersion([{ ...card, segments: [{ duration: 1, startDay: 1, startPart: 0 }, { duration: 1, startDay: 3, startPart: 0 }] }, other])
    ).not.toBe(base);
    expect(sprintBoardVersion([card])).not.toBe(base);
    expect(sprintBoardVersion([card, other, { ...card, taskId: 'RND-3' }])).not.toBe(base);
  });

  it('предупреждает, когда версию не прислали или доска изменилась', () => {
    expect(boardVersionWarnings(undefined, 'abc')[0]).toMatch(/^board_version_not_checked/);
    expect(boardVersionWarnings('old', 'abc')[0]).toMatch(/^board_changed_since_read: .*old → abc/);
    expect(boardVersionWarnings('abc', 'abc')).toEqual([]);
  });
});
