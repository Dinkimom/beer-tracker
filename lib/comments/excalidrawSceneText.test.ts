import { describe, expect, it } from 'vitest';

import { extractExcalidrawSceneText } from './excalidrawSceneText';

describe('extractExcalidrawSceneText', () => {
  it('collects unique non-deleted text from elements', () => {
    expect(
      extractExcalidrawSceneText({
        elements: [
          { id: '1', isDeleted: false, type: 'text', text: '  Alpha  ' },
          { id: '2', isDeleted: true, type: 'text', text: 'Gone' },
          { id: '3', originalText: 'Beta', type: 'text' },
          { id: '4', type: 'rectangle' },
          { id: '5', text: 'Alpha', type: 'text' },
        ],
        v: 1,
      })
    ).toEqual(['Alpha', 'Beta']);
  });

  it('prefers originalText over text when both are set', () => {
    expect(
      extractExcalidrawSceneText({
        elements: [{ originalText: 'Label', text: 'Label\n', type: 'text' }],
        v: 1,
      })
    ).toEqual(['Label']);
  });

  it('returns an empty list for an empty scene', () => {
    expect(extractExcalidrawSceneText({ elements: [], v: 1 })).toEqual([]);
  });
});
