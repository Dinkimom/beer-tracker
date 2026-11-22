/** @vitest-environment jsdom */

import type { Task } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { openCardContextMenu } from './openCardContextMenu';

function ui() {
  return {
    overlays: { setContextMenu: vi.fn(), setContextMenuTaskId: vi.fn() },
    tools: { closeNoteComposer: vi.fn() },
  };
}

function rightClick(target: HTMLElement, x = 5, y = 6) {
  return {
    clientX: x,
    clientY: y,
    currentTarget: target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.MouseEvent;
}

const task = { id: 'A-1', link: '', name: 'A', team: 'Web' } as Task;

describe('openCardContextMenu', () => {
  it('у карточки меню встаёт справа от её границы', () => {
    const card = document.createElement('div');
    card.dataset.contextMenuSource = 'task-card';
    card.getBoundingClientRect = () => ({ bottom: 40, height: 20, left: 10, right: 110, top: 20, width: 100 }) as DOMRect;
    const store = ui();
    openCardContextMenu(store as never, rightClick(card), task);
    expect(store.tools.closeNoteComposer).toHaveBeenCalled();
    expect(store.overlays.setContextMenuTaskId).toHaveBeenCalledWith('A-1');
    expect(store.overlays.setContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ dimPeerUi: true, isBacklogTask: false, position: { x: 118, y: 20 }, task })
    );
  });

  it('вне карточки — у точки клика', () => {
    const store = ui();
    openCardContextMenu(store as never, rightClick(document.createElement('div'), 7, 9), task, { isBacklogTask: true });
    expect(store.overlays.setContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ anchorRect: undefined, isBacklogTask: true, position: { x: 7, y: 9 } })
    );
  });

  it('локальный черновик меню не открывает', () => {
    const store = ui();
    openCardContextMenu(store as never, rightClick(document.createElement('div')), { ...task, isLocalTask: true });
    expect(store.overlays.setContextMenu).not.toHaveBeenCalled();
  });
});
