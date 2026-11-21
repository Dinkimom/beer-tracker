import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { SprintPlannerUiStore } from './sprintPlannerUiStore';

function minimalTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    link: 'https://example.com/task-1',
    name: 'Task',
    team: 'Web',
    ...overrides,
  };
}

describe('SprintPlannerUiStore', () => {
  it('clearTransientUiOnSprintChange сбрасывает поиск, меню, сегменты, режим связей, hover, resize, модалку учёта работ и сайдер информации о задаче', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask();

    store.setGlobalNameFilter('foo');
    store.setSegmentEditTaskId('seg-1');
    store.setContextMenuTaskId('ctx-task');
    store.setContextMenu({
      position: { x: 10, y: 20 },
      task,
    });
    store.openNoteComposer({ mode: 'comment', taskId: 'comment:1' });
    store.setNoteEditPreview('comment:1', { color: 'green' });
    store.openDiagramEditor('comment:1');
    store.openPhotoLightbox('comment:photo-1');
    store.cards.setHoveredTaskId('hover-1');
    store.cards.setBoardDraggingTaskId('drag-1');
    store.cards.setResizingTaskId('resize-1');
    store.cards.setStickyNoteCardRowOverride('comment:1', { layerShiftUp: 0, span: 2 });
    store.cards.setTaskResizePreview({ duration: 4, startCell: 2, taskId: 'comment:1' });
    store.setAccountWorkModal(task);
    store.setAgentRequestTarget({ kind: 'task', task });
    store.openTaskInfoPanel(task);
    store.setNotificationFocusTaskId('DEV-100');
    store.setPlacementTool('diagram');
    store.setLinkingFromTaskId('link-from-1');

    const sidebarBefore = store.sidebarOpen;

    store.clearTransientUiOnSprintChange();

    expect(store.globalNameFilter).toBe('');
    expect(store.notificationFocusTaskId).toBeNull();
    expect(store.segmentEditTaskId).toBeNull();
    expect(store.linkingFromTaskId).toBeNull();
    expect(store.contextMenu).toBeNull();
    expect(store.contextMenuTaskId).toBeNull();
    expect(store.noteComposer).toBeNull();
    expect(store.noteEditPreview).toBeNull();
    expect(store.diagramEditorTaskId).toBeNull();
    expect(store.photoLightboxTaskId).toBeNull();
    expect(store.cards.hoveredTaskId).toBeNull();
    expect(store.cards.boardDraggingTaskId).toBeNull();
    expect(store.cards.resizingTaskId).toBeNull();
    expect(store.cards.stickyNoteCardRowOverrides.size).toBe(0);
    expect(store.cards.stickyNoteCardRowPreview).toBeNull();
    expect(store.cards.taskResizePreview).toBeNull();
    expect(store.accountWorkModal).toBeNull();
    expect(store.agentRequestTarget).toBeNull();
    expect(store.taskInfoPanelTask).toBeNull();
    expect(store.sidebarOpen).toBe(sidebarBefore);
    expect(store.placementTool).toBe('cursor');
  });

  it('setPlacementTool(link) closes an open card context menu', () => {
    const store = new SprintPlannerUiStore();
    store.setContextMenuTaskId('NW-1');
    store.setPlacementTool('link');
    expect(store.contextMenuTaskId).toBeNull();
    expect(store.placementTool).toBe('link');
  });

  it('setLinkingFromTaskId starts a one-shot link without switching the capsule', () => {
    const store = new SprintPlannerUiStore();
    store.setPlacementTool('task');
    store.setLinkingFromTaskId('from-1');
    expect(store.placementTool).toBe('task');
    expect(store.linkingFromTaskId).toBe('from-1');
  });

  it('leaving the link tool drops an in-progress rubber-band', () => {
    const store = new SprintPlannerUiStore();
    store.setPlacementTool('link');
    store.setLinkingFromTaskId('from-1');
    store.setPlacementTool('cursor');
    expect(store.linkingFromTaskId).toBeNull();
    expect(store.placementTool).toBe('cursor');
  });

  it('keeps a copied note in the clipboard across sprint UI reset', () => {
    const store = new SprintPlannerUiStore();
    store.setNoteClipboard({ color: 'pink', height: 2, text: 'Keep', width: 3 });
    store.clearTransientUiOnSprintChange();
    expect(store.noteClipboard).toEqual({ color: 'pink', height: 2, text: 'Keep', width: 3 });
  });

  it('keeps the last sticky-note color across sprint UI reset', () => {
    const store = new SprintPlannerUiStore();
    store.setStickyNoteColor('pink');
    store.clearTransientUiOnSprintChange();
    expect(store.stickyNoteColor).toBe('pink');
  });

  it('openTaskInfoPanel сохраняет задачу и закрывает контекстное меню', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'POG-721', name: 'Detail' });

    store.setContextMenu({
      position: { x: 1, y: 2 },
      task,
    });
    store.setContextMenuTaskId(task.id);
    store.openTaskInfoPanel(task);

    expect(store.taskInfoPanelTask).toEqual(task);
    expect(store.contextMenu).toBeNull();
    expect(store.contextMenuTaskId).toBeNull();
  });

  it('openNoteComposer discards an in-progress note preview', () => {
    const store = new SprintPlannerUiStore();
    store.setNoteEditPreview('comment:1', { color: 'pink', text: 'Draft' });
    store.openNoteComposer({ mode: 'comment', taskId: 'comment:2' });

    expect(store.noteComposer).toEqual({ mode: 'comment', taskId: 'comment:2' });
    expect(store.noteEditPreview).toBeNull();
  });

  it('openNoteComposer closes the context menu and stores the composer target', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'comment:1', name: 'Note' });

    store.setContextMenu({
      position: { x: 1, y: 2 },
      task,
    });
    store.setContextMenuTaskId(task.id);
    store.openNoteComposer({ mode: 'new', taskId: task.id });

    expect(store.noteComposer).toEqual({ mode: 'new', taskId: task.id });
    expect(store.contextMenu).toBeNull();
    expect(store.contextMenuTaskId).toBeNull();
  });

  it('setNoteEditPreview overlays text and color until the composer closes', () => {
    const store = new SprintPlannerUiStore();
    store.openNoteComposer({ mode: 'comment', taskId: 'comment:1' });
    store.setNoteEditPreview('comment:1', { color: 'pink' });
    store.setNoteEditPreview('comment:1', { text: 'Hello' });

    expect(store.noteEditPreview).toEqual({
      color: 'pink',
      taskId: 'comment:1',
      text: 'Hello',
    });

    store.closeNoteComposer();
    expect(store.noteComposer).toBeNull();
    expect(store.noteEditPreview).toBeNull();
  });

  it('patchTaskInfoPanelTask обновляет поля открытой задачи', () => {
    const store = new SprintPlannerUiStore();
    store.openTaskInfoPanel(minimalTask({ name: 'Old', description: 'Old desc' }));
    store.patchTaskInfoPanelTask({ name: 'New', description: 'New desc' });

    expect(store.taskInfoPanelTask?.name).toBe('New');
    expect(store.taskInfoPanelTask?.description).toBe('New desc');
  });

  it('bumps cardLayoutRevision only when resize preview actually changes', () => {
    const store = new SprintPlannerUiStore();
    const start = store.cards.cardLayoutRevision;

    store.cards.setTaskResizePreview({ duration: 3, startCell: null, taskId: 't1' });
    store.cards.setTaskResizePreview({ duration: 3, startCell: null, taskId: 't1' });
    expect(store.cards.cardLayoutRevision).toBe(start + 1);

    store.cards.setStickyNoteCardRowPreview({ layerShiftUp: 0, span: 2, taskId: 't1' });
    store.cards.setStickyNoteCardRowPreview({ layerShiftUp: 0, span: 2, taskId: 't1' });
    expect(store.cards.cardLayoutRevision).toBe(start + 2);

    store.cards.clearTaskResizePreview();
    store.cards.clearStickyNoteCardRowPreview();
    expect(store.cards.taskResizePreview).toBeNull();
    expect(store.cards.stickyNoteCardRowPreview).toBeNull();
    expect(store.cards.cardLayoutRevision).toBe(start + 4);

    store.cards.setTaskResizePreview({ duration: 6, startCell: 1, taskId: 't1' });
    store.cards.discardLocalTaskResizePreview();
    expect(store.cards.taskResizePreview).toBeNull();
    expect(store.cards.localTaskResizeDiscardEpoch).toBe(1);
    expect(store.cards.cardLayoutRevision).toBe(start + 6);
  });

  it('commits card-row preview and override in one revision', () => {
    const store = new SprintPlannerUiStore();
    store.cards.setStickyNoteCardRowPreview({ layerShiftUp: 1, span: 3, taskId: 'note-1' });
    const revision = store.cards.cardLayoutRevision;

    store.cards.commitStickyNoteCardRowLayout('note-1', { layerShiftUp: 1, span: 3 });

    expect(store.cards.stickyNoteCardRowPreview).toBeNull();
    expect(store.cards.getStickyNoteCardRowOverride('note-1')).toEqual({ layerShiftUp: 1, span: 3 });
    expect(store.cards.cardLayoutRevision).toBe(revision + 1);
  });

  it('openPhotoLightbox сохраняет taskId и закрывает контекстное меню', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'comment:photo-1' });

    store.setContextMenu({
      position: { x: 1, y: 2 },
      task,
    });
    store.setContextMenuTaskId(task.id);
    store.openPhotoLightbox(task.id);

    expect(store.photoLightboxTaskId).toBe(task.id);
    expect(store.contextMenu).toBeNull();
    expect(store.contextMenuTaskId).toBeNull();
  });

  it('setHiddenLinkCounts заменяет счётчики скрытых связей и убирает пропавшие задачи', () => {
    const store = new SprintPlannerUiStore();
    store.cards.setHiddenLinkCounts(new Map([['a', 2], ['b', 1]]));
    store.cards.setHiddenLinkCounts(new Map([['a', 3]]));
    expect([...store.cards.hiddenLinkCountByTaskId]).toEqual([['a', 3]]);
  });

  it('копит плашки контекста агента без дублей, снимает их и сбрасывает при смене спринта', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask();

    store.setAgentRequestTarget({ kind: 'task', task });
    store.setAgentRequestTarget(null);
    store.setAgentRequestTarget({ kind: 'note', noteId: 'n-1', text: 'Заметка' });
    store.setAgentRequestTarget({ kind: 'task', task });
    store.setAgentRequestTarget({ kind: 'sprint' });
    expect(store.agentChatContext.map((item) => item.kind)).toEqual(['task', 'note']);

    store.removeAgentChatContext('task:task-1');
    expect(store.agentChatContext.map((item) => item.kind)).toEqual(['note']);

    store.clearTransientUiOnSprintChange();
    expect(store.agentChatContext).toEqual([]);
  });

  it('cardContextMenuState: меню открыто на карточке, остальные приглушены, пока меню просит', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'a' });
    expect(store.cardContextMenuState('a')).toEqual({ dimmed: false, open: false });

    store.setContextMenuTaskId('a');
    store.setContextMenu({
      anchorRect: { bottom: 10, height: 10, left: 0, right: 10, top: 0, width: 10 },
      position: { x: 0, y: 0 },
      task,
    });
    expect(store.cardContextMenuState('a')).toEqual({ dimmed: false, open: true });
    expect(store.cardContextMenuState('b')).toEqual({ dimmed: true, open: false });

    // Меню из кнопки ⋯ без затемнения соседей.
    store.setContextMenu({ dimPeerUi: false, position: { x: 0, y: 0 }, task });
    expect(store.cardContextMenuState('b')).toEqual({ dimmed: false, open: false });

    store.closeContextMenu();
    expect(store.cardContextMenuState('a')).toEqual({ dimmed: false, open: false });
  });
});
