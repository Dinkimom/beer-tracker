import { describe, expect, it } from 'vitest';

import {
  getDiagramCardDashedGhostStyle,
  getDiagramCardDeleteButtonStyle,
  getDiagramCardStyle,
} from './diagramCardSurface';

describe('getDiagramCardStyle', () => {
  it('paints a cool Excalidraw violet frame, not the photo mat', () => {
    const style = getDiagramCardStyle(false);
    expect(style.backgroundColor).toBe('#f3f0ff');
    expect(style.color).toBe('#5b57c4');
    expect(style.backgroundColor).not.toBe('#f6f5f2');
    expect(style.boxShadow).toContain('105, 101, 219');
  });

  it('keeps a deep indigo sheet in dark mode', () => {
    const style = getDiagramCardStyle(true);
    expect(style.backgroundColor).toBe('#1c1b2e');
    expect(style.color).toBe('#c5c1ff');
  });
});

describe('getDiagramCardDashedGhostStyle', () => {
  it('uses the brand-adjacent violet border for the add ghost', () => {
    const style = getDiagramCardDashedGhostStyle(false);
    expect(style.backgroundColor).toBe('#f3f0ff');
    expect(style.borderColor).toBe('#c5bff5');
    expect(style.borderStyle).toBe('dashed');
    expect(style.borderColor).not.toBe('#f6f5f2');
  });
});

describe('getDiagramCardDeleteButtonStyle', () => {
  it('matches the diagram sheet instead of the photo paper', () => {
    const style = getDiagramCardDeleteButtonStyle(false);
    expect(style.backgroundColor).toBe('#f3f0ff');
    expect(style.borderColor).toBe('#c5bff5');
    expect(style.color).toBe('#5b57c4');
  });
});
