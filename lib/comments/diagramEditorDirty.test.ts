import { describe, expect, it } from 'vitest';

import { diagramCanvasRevisionKey, isDiagramEditorDirty } from './diagramEditorDirty';

const rectangle = { id: 'a', isDeleted: false, type: 'rectangle', version: 1 };

describe('diagramCanvasRevisionKey', () => {
  it('ignores camera-only updates and changes when the drawing changes', () => {
    const initial = diagramCanvasRevisionKey({
      elements: [rectangle],
      viewBackgroundColor: '#ffffff',
    });
    expect(
      diagramCanvasRevisionKey({
        elements: [rectangle],
        viewBackgroundColor: '#ffffff',
      })
    ).toBe(initial);
    expect(
      diagramCanvasRevisionKey({
        elements: [{ ...rectangle, version: 2 }],
        viewBackgroundColor: '#ffffff',
      })
    ).not.toBe(initial);
    expect(
      diagramCanvasRevisionKey({
        elements: [rectangle],
        viewBackgroundColor: '#111111',
      })
    ).not.toBe(initial);
  });

  it('tracks files and deletion', () => {
    const withFile = diagramCanvasRevisionKey({
      elements: [rectangle],
      files: { img: { dataURL: 'data:image/png;base64,abc' } },
    });
    expect(
      diagramCanvasRevisionKey({
        elements: [rectangle],
        files: { img: { dataURL: 'data:image/png;base64,abcd' } },
      })
    ).not.toBe(withFile);
    expect(
      diagramCanvasRevisionKey({
        elements: [{ ...rectangle, isDeleted: true }],
      })
    ).not.toBe(diagramCanvasRevisionKey({ elements: [rectangle] }));
  });
});

describe('isDiagramEditorDirty', () => {
  it('stays clean until the name or the canvas differs from the opened scene', () => {
    expect(
      isDiagramEditorDirty({
        canvasRevision: null,
        initialName: 'Flow',
        nameDraft: 'Flow',
        savedCanvasRevision: null,
      })
    ).toBe(false);
    expect(
      isDiagramEditorDirty({
        canvasRevision: 'same',
        initialName: '  Flow  ',
        nameDraft: 'Flow',
        savedCanvasRevision: 'same',
      })
    ).toBe(false);
    expect(
      isDiagramEditorDirty({
        canvasRevision: 'same',
        initialName: 'Flow',
        nameDraft: 'Flow 2',
        savedCanvasRevision: 'same',
      })
    ).toBe(true);
    expect(
      isDiagramEditorDirty({
        canvasRevision: 'next',
        initialName: 'Flow',
        nameDraft: 'Flow',
        savedCanvasRevision: 'opened',
      })
    ).toBe(true);
  });
});
