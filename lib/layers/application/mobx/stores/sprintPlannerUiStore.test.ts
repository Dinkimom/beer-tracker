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
  it('clearTransientUiOnSprintChange сбрасывает поиск, меню, сегменты, режим связей, комментарий, hover, resize, модалку учёта работ и сайдер информации о задаче', () => {
    const store = new SprintPlannerUiStore();
    const task = minimalTask();

    store.setGlobalNameFilter('foo');
    store.setSegmentEditTaskId('seg-1');
    store.setContextMenuTaskId('ctx-task');
    store.setContextMenu({
      position: { x: 10, y: 20 },
      task,
    });
    store.setOpenCommentEditId('comment-1');
    store.openNoteComposer({ mode: 'comment', taskId: 'comment:1' });
    store.setNoteEditPreview('comment:1', { color: 'green' });
    store.openDiagramEditor('comment:1');
    store.openPhotoLightbox('comment:photo-1');
    store.setHoveredTaskId('hover-1');
    store.setBoardDraggingTaskId('drag-1');
    store.setResizingTaskId('resize-1');
    store.setStickyNoteCardRowOverride('comment:1', { layerShiftUp: 0, span: 2 });
    store.setTaskResizePreview({ duration: 4, startCell: 2, taskId: 'comment:1' });
    store.setAccountWorkModal(task);
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
    expect(store.openCommentEditId).toBeNull();
    expect(store.hoveredTaskId).toBeNull();
    expect(store.boardDraggingTaskId).toBeNull();
    expect(store.resizingTaskId).toBeNull();
    expect(store.stickyNoteCardRowOverrides.size).toBe(0);
    expect(store.stickyNoteCardRowPreview).toBeNull();
    expect(store.taskResizePreview).toBeNull();
    expect(store.accountWorkModal).toBeNull();
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
    const start = store.cardLayoutRevision;

    store.setTaskResizePreview({ duration: 3, startCell: null, taskId: 't1' });
    store.setTaskResizePreview({ duration: 3, startCell: null, taskId: 't1' });
    expect(store.cardLayoutRevision).toBe(start + 1);

    store.setStickyNoteCardRowPreview({ layerShiftUp: 0, span: 2, taskId: 't1' });
    store.setStickyNoteCardRowPreview({ layerShiftUp: 0, span: 2, taskId: 't1' });
    expect(store.cardLayoutRevision).toBe(start + 2);

    store.clearTaskResizePreview();
    store.clearStickyNoteCardRowPreview();
    expect(store.taskResizePreview).toBeNull();
    expect(store.stickyNoteCardRowPreview).toBeNull();
    expect(store.cardLayoutRevision).toBe(start + 4);

    store.setTaskResizePreview({ duration: 6, startCell: 1, taskId: 't1' });
    store.discardLocalTaskResizePreview();
    expect(store.taskResizePreview).toBeNull();
    expect(store.localTaskResizeDiscardEpoch).toBe(1);
    expect(store.cardLayoutRevision).toBe(start + 6);
  });

  it('commits card-row preview and override in one revision', () => {
    const store = new SprintPlannerUiStore();
    store.setStickyNoteCardRowPreview({ layerShiftUp: 1, span: 3, taskId: 'note-1' });
    const revision = store.cardLayoutRevision;

    store.commitStickyNoteCardRowLayout('note-1', { layerShiftUp: 1, span: 3 });

    expect(store.stickyNoteCardRowPreview).toBeNull();
    expect(store.getStickyNoteCardRowOverride('note-1')).toEqual({ layerShiftUp: 1, span: 3 });
    expect(store.cardLayoutRevision).toBe(revision + 1);
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
});
