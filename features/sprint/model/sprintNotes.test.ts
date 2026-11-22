import type { SprintComments } from './sprintComments';
import type { SprintLinks } from './sprintLinks';
import type { TaskPositionsStore } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, TaskLink } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { approveSprintComment, rejectAllPendingSprintComments } from '@/lib/api/sprints';

import { SprintNotes } from './sprintNotes';

vi.mock('@/lib/api/sprints', () => ({
  approveAllPendingSprintComments: vi.fn(() => Promise.resolve(true)),
  approveSprintComment: vi.fn(() => Promise.resolve(true)),
  rejectAllPendingSprintComments: vi.fn(() => Promise.resolve(true)),
}));

/** Список с той же формой, что `SyncedList`: правка сразу, удаление — запросом. */
function fakeList<T>(items: T[]) {
  const list = {
    delete: vi.fn((_id: string) => Promise.resolve()),
    items,
    setWithSave: (updater: (prev: T[]) => T[]) => {
      list.items = updater(list.items);
    },
  };
  return list;
}

function note(id: string, fields: Partial<Comment> = {}): Comment {
  return { id, text: id, ...fields } as Comment;
}

function setup(comments: Comment[], links: TaskLink[] = [], sprintId: number | null = 7) {
  const commentList = fakeList(comments);
  const linkList = fakeList(links);
  const positions = { laneLayers: { touch: vi.fn() }, recordPlanHistory: vi.fn() };
  const savePlannerLink = vi.fn(() => Promise.resolve());
  const notes = new SprintNotes({
    comments: commentList as unknown as SprintComments,
    links: linkList as unknown as SprintLinks,
    positions: positions as unknown as TaskPositionsStore,
    savePlannerLink,
    sprintId,
  });
  return { commentList, linkList, notes, positions, savePlannerLink };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SprintNotes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('удаление убирает заметку и её стрелки, потом удаляет на сервере', async () => {
    const { commentList, linkList, notes } = setup(
      [note('c1'), note('c2')],
      [
        { fromTaskId: 'comment:c1', id: 'l1', toTaskId: 'A-1' },
        { fromTaskId: 'A-1', id: 'l2', toTaskId: 'A-2' },
      ]
    );
    await notes.remove('c1');
    expect(commentList.items.map((c) => c.id)).toEqual(['c2']);
    expect(linkList.items.map((l) => l.id)).toEqual(['l2']);
    expect(commentList.delete).toHaveBeenCalledWith('c1');
  });

  it('при конвертации в задачу стрелки перецепляются на задачу до удаления заметки', async () => {
    const { commentList, linkList, notes, savePlannerLink } = setup(
      [note('c1')],
      [{ fromTaskId: 'comment:c1', id: 'l1', toTaskId: 'comment:c9' }]
    );
    await notes.remove('c1', { retargetLinksTo: 'A-5' });
    expect(linkList.items).toEqual([expect.objectContaining({ fromTaskId: 'A-5', toTaskId: 'comment:c9' })]);
    expect(savePlannerLink).toHaveBeenCalled();
    expect(commentList.delete).toHaveBeenCalledWith('c1');
  });

  it('принятие черновика откатывается, если сервер не принял', async () => {
    vi.mocked(approveSprintComment).mockResolvedValueOnce(false);
    const draft = note('c1', { pendingApproval: true } as Partial<Comment>);
    const { commentList, notes } = setup([draft]);
    notes.approve('c1');
    expect(commentList.items[0]?.pendingApproval).not.toBe(true);
    await flush();
    expect(commentList.items).toEqual([draft]);
  });

  it('отклонение убирает черновики со стрелками и возвращает их при ошибке сервера', async () => {
    vi.mocked(rejectAllPendingSprintComments).mockRejectedValueOnce(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { commentList, linkList, notes } = setup(
      [note('c1'), note('c2')],
      [{ fromTaskId: 'comment:c1', id: 'l1', toTaskId: 'A-1' }]
    );
    notes.rejectAll(['c1']);
    expect(commentList.items.map((c) => c.id)).toEqual(['c2']);
    expect(linkList.items).toEqual([]);
    expect(linkList.delete).toHaveBeenCalledWith('l1');
    await flush();
    expect(commentList.items.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    expect(linkList.items.map((l) => l.id)).toEqual(['l1']);
  });

  it('перемещение пишет шаг истории и сдвигает слои дорожки; без истории — только сдвиг', () => {
    const { commentList, notes, positions } = setup([note('c1', { day: 0 } as Partial<Comment>)]);
    notes.move('c1', { day: 2 });
    expect(commentList.items[0]).toMatchObject({ day: 2 });
    expect(positions.recordPlanHistory).toHaveBeenCalledTimes(1);
    expect(positions.laneLayers.touch).toHaveBeenCalledWith('comment:c1');
    notes.move('c1', { day: 3 }, { recordHistory: false });
    expect(positions.recordPlanHistory).toHaveBeenCalledTimes(1);
  });

  it('цвет из реакции берёт заметку по id дорожки', () => {
    const { commentList, notes } = setup([note('c1')]);
    notes.paintColor('comment:c1', 'green');
    notes.paintColor('A-1', 'pink');
    expect(commentList.items[0]).toMatchObject({ color: 'green' });
  });
});
