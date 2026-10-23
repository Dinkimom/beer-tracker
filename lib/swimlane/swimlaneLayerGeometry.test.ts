/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  readSwimlaneLayerGeometry,
  swimlaneLayerGeometryDataAttributes,
  swimlaneHoverLayerFromOffset,
} from './swimlaneLayerGeometry';

describe('swimlaneHoverLayerFromOffset', () => {
  const geometry = { layerCount: 3, originPx: 12, pitchPx: 70 };

  it('tells the upper and the lower half of a row apart', () => {
    expect(swimlaneHoverLayerFromOffset(12 + 10, geometry)).toBe(0);
    expect(swimlaneHoverLayerFromOffset(12 + 50, geometry)).toBe(0.5);
    expect(swimlaneHoverLayerFromOffset(12 + 70 + 10, geometry)).toBe(1);
    expect(swimlaneHoverLayerFromOffset(12 + 140 + 60, geometry)).toBe(2.5);
  });

  it('stays on the first row above the lane and offers one new row below it', () => {
    expect(swimlaneHoverLayerFromOffset(-200, geometry)).toBe(0);
    expect(swimlaneHoverLayerFromOffset(12 + 70 * 3 + 5, geometry)).toBe(3);
    expect(swimlaneHoverLayerFromOffset(12 + 70 * 10, geometry)).toBe(3);
  });
});

describe('readSwimlaneLayerGeometry', () => {
  it('reads back what the lane writes into data attributes', () => {
    const element = document.createElement('div');
    for (const [name, value] of Object.entries(
      swimlaneLayerGeometryDataAttributes({ layerCount: 2, originPx: 12, pitchPx: 64 })
    )) {
      element.setAttribute(name, value);
    }
    expect(readSwimlaneLayerGeometry(element)).toEqual({ layerCount: 2, originPx: 12, pitchPx: 64 });
  });

  it('returns null for a lane without geometry', () => {
    expect(readSwimlaneLayerGeometry(document.createElement('div'))).toBeNull();
  });
});
