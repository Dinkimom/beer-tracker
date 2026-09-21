import type { Task, TaskPosition } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS } from './applyQuickAddDraftFields';
import {
  createQuickAddDraftInSwimlaneCell,
  createSwimlaneCellFromPlacementTool,
  openQuickAddDraftInSwimlaneCell,
} from './createQuickAddDraftInSwimlaneCell';

describe('createQuickAddDraftInSwimlaneCell', () => {
  it('opens an image draft with the pasted photo and two-cell width', () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();

    createQuickAddDraftInSwimlaneCell({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 2,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      imageUrl: 'blob:photo',
      kind: 'image',
      part: 1,
      setTaskPositions,
      setTasks,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]).toMatchObject({
      imageUrl: 'blob:photo',
      isLocalTask: true,
      localDraftKind: 'image',
      storyPoints: 0,
    });
    const nextPositions = setTaskPositions.mock.calls[0][0](new Map()) as Map<string, TaskPosition>;
    const position = nextPositions.get(nextTasks[0].id);
    expect(position).toMatchObject({
      assignee: 'dev-1',
      duration: QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS,
      startDay: 2,
      startPart: 1,
    });
  });

  it('opens a chooser draft without a kind until the user picks one', () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();

    createQuickAddDraftInSwimlaneCell({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      setTaskPositions,
      setTasks,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]).toMatchObject({
      isLocalTask: true,
      name: '',
      storyPoints: 0,
    });
    expect(nextTasks[0].localDraftKind).toBeUndefined();
    const nextPositions = setTaskPositions.mock.calls[0][0](new Map()) as Map<string, TaskPosition>;
    expect(nextPositions.get(nextTasks[0].id)?.duration).toBe(1);
  });

  it('copies the feature-row parent onto the local draft', () => {
    const setTasks = vi.fn();
    const parent = { display: 'Черновик', id: 'feature-draft:1', key: 'feature-draft:1' };

    createQuickAddDraftInSwimlaneCell({
      assigneeId: 'feature-draft:1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [],
      getQueueByBoardId: () => 'QUEUE',
      kind: 'comment',
      parent,
      part: 0,
      setTaskPositions: vi.fn(),
      setTasks,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]?.parent).toEqual(parent);
  });

  it('does not open a draft for an unsupported clipboard file', async () => {
    const setTasks = vi.fn();
    const t = vi.fn((key: string) => key);

    await openQuickAddDraftInSwimlaneCell({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      imageFile: new File([new Uint8Array(8)], 'icon.svg', { type: 'image/svg+xml' }),
      part: 0,
      setTaskPositions: vi.fn(),
      setTasks,
      t,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    expect(setTasks).not.toHaveBeenCalled();
    expect(t).toHaveBeenCalledWith('sprintPlanner.swimlane.quickAddMenu.imageInvalidType');
  });

  it('ignores a pasted photo when the photos layer is off', async () => {
    const setTasks = vi.fn();
    const t = vi.fn((key: string) => key);

    await openQuickAddDraftInSwimlaneCell({
      allowImageDraft: false,
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      imageFile: new File([new Uint8Array(8)], 'shot.png', { type: 'image/png' }),
      part: 0,
      setTaskPositions: vi.fn(),
      setTasks,
      t,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    expect(setTasks).not.toHaveBeenCalled();
    expect(t).not.toHaveBeenCalled();
  });

  it('opens a note draft when the note tool is selected', () => {
    const setTasks = vi.fn();

    createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      placementTool: 'comment',
      setTaskPositions: vi.fn(),
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0].localDraftKind).toBe('comment');
    expect(nextTasks[0].stickyNoteColor).toBe('yellow');
  });

  it('paints a note draft with the last sticky-note color', () => {
    const setTasks = vi.fn();

    createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      placementTool: 'comment',
      setTaskPositions: vi.fn(),
      setTasks,
      stickyNoteColor: 'pink',
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]).toMatchObject({
      localDraftKind: 'comment',
      stickyNoteColor: 'pink',
    });
  });

  it('opens a task chooser on the shared team row', async () => {
    const setTasks = vi.fn();

    await createSwimlaneCellFromPlacementTool({
      assigneeId: '__team__',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: '__team__', name: 'Shared', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      placementTool: 'task',
      setTaskPositions: vi.fn(),
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]).toMatchObject({
      assignee: '__team__',
      isLocalTask: true,
    });
    expect(nextTasks[0].localDraftKind).toBeUndefined();
  });

  it('does not open a draft when the cursor tool is selected', async () => {
    const setTasks = vi.fn();

    await createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      placementTool: 'cursor',
      setTaskPositions: vi.fn(),
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    expect(setTasks).not.toHaveBeenCalled();
  });

  it('does not open a draft when the link tool is selected', async () => {
    const setTasks = vi.fn();

    await createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      placementTool: 'link',
      setTaskPositions: vi.fn(),
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    expect(setTasks).not.toHaveBeenCalled();
  });

  it('does not open a draft when the time-off tool is selected', async () => {
    const setTasks = vi.fn();

    await createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      part: 0,
      placementTool: 'availability',
      setTaskPositions: vi.fn(),
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    expect(setTasks).not.toHaveBeenCalled();
  });

  it('opens an empty photo draft when the photo tool is selected', async () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const onCreated = vi.fn();

    await createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      onCreated,
      part: 0,
      placementTool: 'image',
      setTaskPositions,
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]).toMatchObject({
      isLocalTask: true,
      localDraftKind: 'image',
    });
    expect(nextTasks[0].imageUrl).toBeUndefined();
    const nextPositions = setTaskPositions.mock.calls[0][0](new Map()) as Map<string, TaskPosition>;
    expect(nextPositions.get(nextTasks[0].id)?.duration).toBe(QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS);
    expect(onCreated).toHaveBeenCalledWith(nextTasks[0].id, 'image');
  });

  it('opens an empty 2x2 diagram draft when the diagram tool is selected', async () => {
    const setTasks = vi.fn();
    const setTaskPositions = vi.fn();
    const onCreated = vi.fn();

    await createSwimlaneCellFromPlacementTool({
      assigneeId: 'dev-1',
      boardIdForPlannerData: 1,
      day: 0,
      developers: [{ id: 'dev-1', name: 'Ada', role: 'developer' }],
      getQueueByBoardId: () => 'QUEUE',
      onCreated,
      part: 0,
      placementTool: 'diagram',
      setTaskPositions,
      setTasks,
      t: (key) => key,
      tasksMap: new Map(),
      timelineTotalParts: 30,
    });

    const nextTasks = setTasks.mock.calls[0][0]([]) as Task[];
    expect(nextTasks[0]).toMatchObject({
      isLocalTask: true,
      localDraftKind: 'diagram',
      name: '',
    });
    const nextPositions = setTaskPositions.mock.calls[0][0](new Map()) as Map<string, TaskPosition>;
    expect(nextPositions.get(nextTasks[0].id)?.duration).toBe(QUICK_ADD_IMAGE_DRAFT_DURATION_PARTS);
    expect(onCreated).toHaveBeenCalledWith(nextTasks[0].id, 'diagram');
  });
});
