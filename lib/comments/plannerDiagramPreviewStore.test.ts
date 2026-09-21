import { describe, expect, it } from 'vitest';

import { emptyExcalidrawCommentScene } from '@/lib/comments/excalidrawCommentPayload';

import {
  bumpPlannerDiagramRemoteEpoch,
  getPlannerDiagramRemoteEpoch,
  getPlannerDiagramScene,
  markPlannerDiagramEditorFresh,
  rememberPlannerDiagramScene,
  shouldReusePlannerDiagramCache,
  shouldUseCachedPlannerDiagramEditorScene,
  subscribePlannerDiagramPreview,
  takePlannerDiagramEditorFresh,
} from './plannerDiagramPreviewStore';

describe('plannerDiagramPreviewStore', () => {
  it('notifies subscribers when a scene is remembered', () => {
    const seen: Array<ReturnType<typeof getPlannerDiagramScene>> = [];
    const unsubscribe = subscribePlannerDiagramPreview(() => {
      seen.push(getPlannerDiagramScene('c1'));
    });
    const scene = { ...emptyExcalidrawCommentScene(), name: 'Flow' };
    rememberPlannerDiagramScene('c1', scene);
    unsubscribe();
    expect(getPlannerDiagramScene('c1')).toBe(scene);
    expect(seen).toEqual([scene]);
  });

  it('exposes a one-shot fresh-editor flag', () => {
    markPlannerDiagramEditorFresh('c2');
    expect(takePlannerDiagramEditorFresh('c2')).toBe(true);
    expect(takePlannerDiagramEditorFresh('c2')).toBe(false);
  });

  it('bumps remote epoch so previews refetch after SSE', () => {
    const before = getPlannerDiagramRemoteEpoch();
    const seen: number[] = [];
    const unsubscribe = subscribePlannerDiagramPreview(() => {
      seen.push(getPlannerDiagramRemoteEpoch());
    });
    bumpPlannerDiagramRemoteEpoch();
    unsubscribe();
    expect(getPlannerDiagramRemoteEpoch()).toBe(before + 1);
    expect(seen).toEqual([before + 1]);
  });

  it('reuses optimistic cache until the remote epoch changes', () => {
    expect(shouldReusePlannerDiagramCache(true, null, 0)).toBe(true);
    expect(shouldReusePlannerDiagramCache(true, 0, 0)).toBe(true);
    expect(shouldReusePlannerDiagramCache(true, 0, 1)).toBe(false);
    expect(shouldReusePlannerDiagramCache(false, null, 0)).toBe(false);
  });

  it('does not open the editor from an empty cached scene unless it is freshly created', () => {
    expect(shouldUseCachedPlannerDiagramEditorScene(null, false)).toBe(false);
    expect(shouldUseCachedPlannerDiagramEditorScene(emptyExcalidrawCommentScene(), true)).toBe(true);
    expect(shouldUseCachedPlannerDiagramEditorScene(emptyExcalidrawCommentScene(), false)).toBe(
      false
    );
    expect(
      shouldUseCachedPlannerDiagramEditorScene(
        { elements: [{ id: 'a', type: 'rectangle' }], v: 1 },
        false
      )
    ).toBe(true);
  });
});
