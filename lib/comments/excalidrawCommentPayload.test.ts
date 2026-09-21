import { describe, expect, it } from 'vitest';

import {
  encodeEmptyExcalidrawComment,
  encodeExcalidrawCommentScene,
  encodeExcalidrawCommentWithName,
  EXCALIDRAW_COMMENT_PREFIX,
  excalidrawSceneHasDrawableElements,
  isExcalidrawCommentText,
  parseExcalidrawCommentScene,
  resolveExcalidrawSceneBackground,
  serializeExcalidrawScene,
} from './excalidrawCommentPayload';

describe('excalidrawCommentPayload', () => {
  it('detects the versioned prefix and ignores ordinary notes', () => {
    expect(isExcalidrawCommentText(encodeEmptyExcalidrawComment())).toBe(true);
    expect(isExcalidrawCommentText('hello')).toBe(false);
    expect(isExcalidrawCommentText('')).toBe(false);
    expect(isExcalidrawCommentText(undefined)).toBe(false);
  });

  it('round-trips a scene with elements, name and appState', () => {
    const encoded = encodeExcalidrawCommentScene({
      appState: { viewBackgroundColor: '#fff' },
      elements: [{ id: 'a', type: 'rectangle' }],
      name: 'Architecture',
      v: 1,
    });
    expect(encoded.startsWith(EXCALIDRAW_COMMENT_PREFIX)).toBe(true);
    expect(parseExcalidrawCommentScene(encoded)).toEqual({
      appState: { viewBackgroundColor: '#fff' },
      elements: [{ id: 'a', type: 'rectangle' }],
      name: 'Architecture',
      v: 1,
    });
  });

  it('stores a trimmed name on an empty scene', () => {
    expect(parseExcalidrawCommentScene(encodeEmptyExcalidrawComment('  Flow  '))).toEqual({
      elements: [],
      name: 'Flow',
      v: 1,
    });
  });

  it('renames a scene and can clear the name', () => {
    const encoded = encodeExcalidrawCommentScene({
      elements: [{ id: 'a', type: 'rectangle' }],
      name: 'Old',
      v: 1,
    });
    expect(parseExcalidrawCommentScene(encodeExcalidrawCommentWithName(encoded, '  New  ') ?? '')).toEqual({
      elements: [{ id: 'a', type: 'rectangle' }],
      name: 'New',
      v: 1,
    });
    expect(parseExcalidrawCommentScene(encodeExcalidrawCommentWithName(encoded, '   ') ?? '')).toEqual({
      elements: [{ id: 'a', type: 'rectangle' }],
      v: 1,
    });
    expect(encodeExcalidrawCommentWithName('plain note', 'Name')).toBeNull();
  });

  it('returns an empty scene for a prefix without JSON or invalid JSON', () => {
    expect(parseExcalidrawCommentScene(EXCALIDRAW_COMMENT_PREFIX)).toEqual({
      elements: [],
      v: 1,
    });
    expect(parseExcalidrawCommentScene(`${EXCALIDRAW_COMMENT_PREFIX}{not-json`)).toEqual({
      elements: [],
      v: 1,
    });
    expect(parseExcalidrawCommentScene('plain')).toBeNull();
  });

  it('uses the scene canvas color and falls back to white', () => {
    expect(resolveExcalidrawSceneBackground(null)).toBe('#ffffff');
    expect(resolveExcalidrawSceneBackground({ elements: [], v: 1 })).toBe('#ffffff');
    expect(
      resolveExcalidrawSceneBackground({
        appState: { viewBackgroundColor: '  #f5f0e8  ' },
        elements: [],
        v: 1,
      })
    ).toBe('#f5f0e8');
    expect(
      resolveExcalidrawSceneBackground({
        appState: { viewBackgroundColor: '   ' },
        elements: [],
        v: 1,
      })
    ).toBe('#ffffff');
  });

  it('detects drawable scene elements and ignores deleted ones', () => {
    expect(excalidrawSceneHasDrawableElements({ elements: [], v: 1 })).toBe(false);
    expect(
      excalidrawSceneHasDrawableElements({
        elements: [{ id: 'a', isDeleted: true, type: 'rectangle' }],
        v: 1,
      })
    ).toBe(false);
    expect(
      excalidrawSceneHasDrawableElements({
        elements: [{ id: 'a', type: 'rectangle' }],
        v: 1,
      })
    ).toBe(true);
  });

  it('serializes a scene as JSON without the comment prefix', () => {
    const json = serializeExcalidrawScene({
      elements: [{ id: 'a', type: 'rectangle' }],
      name: 'Flow',
      v: 1,
    });
    expect(json.startsWith(EXCALIDRAW_COMMENT_PREFIX)).toBe(false);
    expect(JSON.parse(json)).toEqual({
      elements: [{ id: 'a', type: 'rectangle' }],
      name: 'Flow',
      v: 1,
    });
  });
});
