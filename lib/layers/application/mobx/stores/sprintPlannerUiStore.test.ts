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

    store.focus.setGlobalNameFilter('foo');
    store.tools.setSegmentEditTaskId('seg-1');
    store.overlays.setContextMenuTaskId('ctx-task');
    store.overlays.setContextMenu({
      position: { x: 10, y: 20 },
      task,
    });
    store.tools.openNoteComposer({ mode: 'comment', taskId: 'comment:1' });
    store.tools.setNoteEditPreview('comment:1', { color: 'green' });
    store.tools.openDiagramEditor('comment:1');
    store.tools.openPhotoLightbox('comment:photo-1');
    store.cards.setHoveredTaskId('hover-1');
    store.cards.setBoardDraggingTaskId('drag-1');
    store.cards.setResizingTaskId('resize-1');
    store.cards.setStickyNoteCardRowOverride('comment:1', { layerShiftUp: 0, span: 2 });
    store.cards.setTaskResizePreview({ duration: 4, startCell: 2, taskId: 'comment:1' });
    store.overlays.setAccountWorkModal(task);
    store.agentChat.setAgentRequestTarget({ kind: 'task', task });
    store.overlays.openTaskInfoPanel(task);
    store.focus.setNotificationFocusTaskId('DEV-100');
    store.tools.setPlacementTool('diagram');
    store.tools.setLinkingFromTaskId('link-from-1');

    const sidebarBefore = store.overlays.sidebarOpen;

    store.clearTransientUiOnSprintChange();

    expect(store.focus.globalNameFilter).toBe('');
    expect(store.focus.notificationFocusTaskId).toBeNull();
    expect(store.tools.segmentEditTaskId).toBeNull();
    expect(store.tools.linkingFromTaskId).toBeNull();
    expect(store.overlays.contextMenu).toBeNull();
    expect(store.overlays.contextMenuTaskId).toBeNull();
    expect(store.tools.noteComposer).toBeNull();
    expect(store.tools.noteEditPreview).toBeNull();
    expect(store.tools.diagramEditorTaskId).toBeNull();
    expect(store.tools.photoLightboxTaskId).toBeNull();
    expect(store.cards.hoveredTaskId).toBeNull();
    expect(store.cards.boardDraggingTaskId).toBeNull();
    expect(store.cards.resizingTaskId).toBeNull();
    expect(store.cards.stickyNoteCardRowOverrides.size).toBe(0);
    expect(store.cards.stickyNoteCardRowPreview).toBeNull();
    expect(store.cards.taskResizePreview).toBeNull();
    expect(store.overlays.accountWorkModal).toBeNull();
    expect(store.agentChat.agentRequestTarget).toBeNull();
    expect(store.overlays.taskInfoPanelTask).toBeNull();
    expect(store.overlays.sidebarOpen).toBe(sidebarBefore);
    expect(store.tools.placementTool).toBe('cursor');
  });

  it('setPlacementTool(link) closes an open card context menu', () => {
    const store = new SprintPlannerUiStore();
    store.overlays.setContextMenuTaskId('NW-1');
    store.tools.setPlacementTool('link');
    expect(store.overlays.contextMenuTaskId).toBeNull();
    expect(store.tools.placementTool).toBe('link');
  });

  it('setLinkingFromTaskId starts a one-shot link without switching the capsule', () => {
    const store = new SprintPlannerUiStore();
    store.tools.setPlacementTool('task');
    store.tools.setLinkingFromTaskId('from-1');
    expect(store.tools.placementTool).toBe('task');
    expect(store.tools.linkingFromTaskId).toBe('from-1');
  });

  it('leaving the link tool drops an in-progress rubber-band', () => {
    const store = new SprintPlannerUiStore();
    store.tools.setPlacementTool('link');
    store.tools.setLinkingFromTaskId('from-1');
    store.tools.setPlacementTool('cursor');
    expect(store.tools.linkingFromTaskId).toBeNull();
    expect(store.tools.placementTool).toBe('cursor');
  });

  it('keeps a copied note in the clipboard across sprint UI reset', () => {
    const store = new SprintPlannerUiStore();
    store.tools.setNoteClipboard({ color: 'pink', height: 2, text: 'Keep', width: 3 });
    store.clearTransientUiOnSprintChange();
    expect(store.tools.noteClipboard).toEqual({ color: 'pink', height: 2, text: 'Keep', width: 3 });
  });

  it('keeps the last sticky-note color across sprint UI reset', () => {
    const store = new SprintPlannerUiStore();
    store.tools.setStickyNoteColor('pink');
    store.clearTransientUiOnSprintChange();
    expect(store.tools.stickyNoteColor).toBe('pink');
  });

  it('openTaskInfoPanel сохраняет задачу и закрывает контекстное меню', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'POG-721', name: 'Detail' });

    store.overlays.setContextMenu({
      position: { x: 1, y: 2 },
      task,
    });
    store.overlays.setContextMenuTaskId(task.id);
    store.overlays.openTaskInfoPanel(task);

    expect(store.overlays.taskInfoPanelTask).toEqual(task);
    expect(store.overlays.contextMenu).toBeNull();
    expect(store.overlays.contextMenuTaskId).toBeNull();
  });

  it('openNoteComposer discards an in-progress note preview', () => {
    const store = new SprintPlannerUiStore();
    store.tools.setNoteEditPreview('comment:1', { color: 'pink', text: 'Draft' });
    store.tools.openNoteComposer({ mode: 'comment', taskId: 'comment:2' });

    expect(store.tools.noteComposer).toEqual({ mode: 'comment', taskId: 'comment:2' });
    expect(store.tools.noteEditPreview).toBeNull();
  });

  it('openNoteComposer closes the context menu and stores the composer target', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'comment:1', name: 'Note' });

    store.overlays.setContextMenu({
      position: { x: 1, y: 2 },
      task,
    });
    store.overlays.setContextMenuTaskId(task.id);
    store.tools.openNoteComposer({ mode: 'new', taskId: task.id });

    expect(store.tools.noteComposer).toEqual({ mode: 'new', taskId: task.id });
    expect(store.overlays.contextMenu).toBeNull();
    expect(store.overlays.contextMenuTaskId).toBeNull();
  });

  it('setNoteEditPreview overlays text and color until the composer closes', () => {
    const store = new SprintPlannerUiStore();
    store.tools.openNoteComposer({ mode: 'comment', taskId: 'comment:1' });
    store.tools.setNoteEditPreview('comment:1', { color: 'pink' });
    store.tools.setNoteEditPreview('comment:1', { text: 'Hello' });

    expect(store.tools.noteEditPreview).toEqual({
      color: 'pink',
      taskId: 'comment:1',
      text: 'Hello',
    });

    store.tools.closeNoteComposer();
    expect(store.tools.noteComposer).toBeNull();
    expect(store.tools.noteEditPreview).toBeNull();
  });

  it('patchTaskInfoPanelTask обновляет поля открытой задачи', () => {
    const store = new SprintPlannerUiStore();
    store.overlays.openTaskInfoPanel(minimalTask({ name: 'Old', description: 'Old desc' }));
    store.overlays.patchTaskInfoPanelTask({ name: 'New', description: 'New desc' });

    expect(store.overlays.taskInfoPanelTask?.name).toBe('New');
    expect(store.overlays.taskInfoPanelTask?.description).toBe('New desc');
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

    store.overlays.setContextMenu({
      position: { x: 1, y: 2 },
      task,
    });
    store.overlays.setContextMenuTaskId(task.id);
    store.tools.openPhotoLightbox(task.id);

    expect(store.tools.photoLightboxTaskId).toBe(task.id);
    expect(store.overlays.contextMenu).toBeNull();
    expect(store.overlays.contextMenuTaskId).toBeNull();
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

    store.agentChat.setAgentRequestTarget({ kind: 'task', task });
    store.agentChat.setAgentRequestTarget(null);
    store.agentChat.setAgentRequestTarget({ kind: 'note', noteId: 'n-1', text: 'Заметка' });
    store.agentChat.setAgentRequestTarget({ kind: 'task', task });
    store.agentChat.setAgentRequestTarget({ kind: 'sprint' });
    expect(store.agentChat.agentChatContext.map((item) => item.kind)).toEqual(['task', 'note']);

    store.agentChat.removeAgentChatContext('task:task-1');
    expect(store.agentChat.agentChatContext.map((item) => item.kind)).toEqual(['note']);

    store.clearTransientUiOnSprintChange();
    expect(store.agentChat.agentChatContext).toEqual([]);
  });

  it('cardContextMenuState: меню открыто на карточке, остальные приглушены, пока меню просит', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask({ id: 'a' });
    expect(store.overlays.cardContextMenuState('a')).toEqual({ dimmed: false, open: false });

    store.overlays.setContextMenuTaskId('a');
    store.overlays.setContextMenu({
      anchorRect: { bottom: 10, height: 10, left: 0, right: 10, top: 0, width: 10 },
      position: { x: 0, y: 0 },
      task,
    });
    expect(store.overlays.cardContextMenuState('a')).toEqual({ dimmed: false, open: true });
    expect(store.overlays.cardContextMenuState('b')).toEqual({ dimmed: true, open: false });

    // Меню из кнопки ⋯ без затемнения соседей.
    store.overlays.setContextMenu({ dimPeerUi: false, position: { x: 0, y: 0 }, task });
    expect(store.overlays.cardContextMenuState('b')).toEqual({ dimmed: false, open: false });

    store.overlays.closeContextMenu();
    expect(store.overlays.cardContextMenuState('a')).toEqual({ dimmed: false, open: false });
  });
});
