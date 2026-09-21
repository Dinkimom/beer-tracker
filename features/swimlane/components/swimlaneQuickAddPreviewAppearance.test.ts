import { describe, expect, it } from 'vitest';

import {
  resolveSwimlaneQuickAddPlacementFootprint,
  resolveSwimlaneQuickAddRowGrowLayers,
  resolveSwimlaneQuickAddPreviewClass,
  resolveSwimlaneQuickAddPreviewDurationCells,
  resolveSwimlaneQuickAddPreviewKind,
  resolveSwimlaneQuickAddPreviewLayerSpan,
  resolveSwimlaneQuickAddPreviewLayout,
  resolveSwimlaneQuickAddPreviewToolProps,
} from './swimlaneQuickAddPreviewAppearance';

describe('resolveSwimlaneQuickAddPreviewKind', () => {
  it('prefers the photo tool over the note tool', () => {
    expect(resolveSwimlaneQuickAddPreviewKind({ isImageTool: true, isNoteTool: true })).toBe(
      'image'
    );
    expect(resolveSwimlaneQuickAddPreviewKind({ isImageTool: false, isNoteTool: true })).toBe(
      'note'
    );
    expect(resolveSwimlaneQuickAddPreviewKind({ isImageTool: false, isNoteTool: false })).toBe(
      'task'
    );
    expect(
      resolveSwimlaneQuickAddPreviewKind({
        isDiagramTool: true,
        isImageTool: false,
        isNoteTool: false,
      })
    ).toBe('diagram');
  });
});

describe('resolveSwimlaneQuickAddPreviewToolProps', () => {
  it('picks the photo icon and ghost for the photo tool', () => {
    expect(resolveSwimlaneQuickAddPreviewToolProps('image', 'yellow')).toEqual({
      iconName: 'image',
      isImageTool: true,
    });
  });

  it('passes the last sticky-note color only for the note tool', () => {
    expect(resolveSwimlaneQuickAddPreviewToolProps('comment', 'pink')).toEqual({
      iconName: 'plus',
      isImageTool: false,
      noteColor: 'pink',
    });
    expect(resolveSwimlaneQuickAddPreviewToolProps('task', 'pink').noteColor).toBeUndefined();
  });

  it('picks the diagram icon and 2x2 ghost for the diagram tool', () => {
    expect(resolveSwimlaneQuickAddPreviewToolProps('diagram', 'yellow')).toEqual({
      iconName: 'diagram',
      isDiagramTool: true,
      isImageTool: false,
    });
  });
});

describe('resolveSwimlaneQuickAddPreviewClass', () => {
  it('keeps the rounded dashed slot for tasks and a square outline for notes and photos', () => {
    expect(resolveSwimlaneQuickAddPreviewClass('task')).toContain('rounded-lg');
    expect(resolveSwimlaneQuickAddPreviewClass('note')).not.toContain('rounded-lg');
    expect(resolveSwimlaneQuickAddPreviewClass('image')).toContain('border-dashed');
  });
});

describe('resolveSwimlaneQuickAddPreviewDurationCells', () => {
  it('uses two cells for a photo when the sprint still has room', () => {
    expect(resolveSwimlaneQuickAddPreviewDurationCells('image', 8)).toBe(2);
    expect(resolveSwimlaneQuickAddPreviewDurationCells('image', 1)).toBe(1);
    expect(resolveSwimlaneQuickAddPreviewDurationCells('note', 8)).toBe(1);
    expect(resolveSwimlaneQuickAddPreviewDurationCells('diagram', 8)).toBe(2);
    expect(resolveSwimlaneQuickAddPreviewDurationCells('diagram', 1)).toBe(1);
  });
});

describe('resolveSwimlaneQuickAddPlacementFootprint', () => {
  it('matches the 2x2 photo card and keeps a one-cell slot for other tools', () => {
    expect(resolveSwimlaneQuickAddPlacementFootprint(true)).toEqual({
      durationCells: 2,
      span: 2,
    });
    expect(resolveSwimlaneQuickAddPlacementFootprint(false)).toEqual({
      durationCells: 1,
      span: 1,
    });
  });
});

describe('resolveSwimlaneQuickAddRowGrowLayers', () => {
  it('grows like a photo when the 2x2 plus starts on the first layer', () => {
    expect(
      resolveSwimlaneQuickAddRowGrowLayers({
        hideQuickAddPreview: false,
        hoverPreview: { layer: 0, span: 2 },
      })
    ).toEqual({ previewSpanLayers: 2 });
  });

  it('grows with stacked gaps when the plus starts below a filled first layer', () => {
    expect(
      resolveSwimlaneQuickAddRowGrowLayers({
        hideQuickAddPreview: false,
        hoverPreview: { layer: 1, span: 2 },
      })
    ).toEqual({ hoverMinTaskLayers: 3 });
  });

  it('does not reserve extra height for a one-row plus or a hidden preview', () => {
    expect(
      resolveSwimlaneQuickAddRowGrowLayers({
        hideQuickAddPreview: false,
        hoverPreview: { layer: 0, span: 1 },
      })
    ).toEqual({});
    expect(
      resolveSwimlaneQuickAddRowGrowLayers({
        hideQuickAddPreview: true,
        hoverPreview: { layer: 0, span: 2 },
      })
    ).toEqual({});
    expect(
      resolveSwimlaneQuickAddRowGrowLayers({
        hideQuickAddPreview: false,
        hoverPreview: null,
      })
    ).toEqual({});
  });
});

describe('resolveSwimlaneQuickAddPreviewLayerSpan', () => {
  it('stretches a photo ghost across two card rows', () => {
    expect(resolveSwimlaneQuickAddPreviewLayerSpan('image', 1)).toBe(2);
    expect(resolveSwimlaneQuickAddPreviewLayerSpan('note', 1)).toBe(1);
    expect(resolveSwimlaneQuickAddPreviewLayerSpan('diagram', 1)).toBe(2);
  });
});

describe('resolveSwimlaneQuickAddPreviewLayout', () => {
  const band = { height: '48px', top: '12px' };
  const horizontal = { left: '10%', width: 'calc(8% - 4px)' };

  it('fills the timeslot for the default plus', () => {
    expect(
      resolveSwimlaneQuickAddPreviewLayout({ band, horizontal, kind: 'task' })
    ).toEqual({ ...band, ...horizontal });
  });

  it('makes the note preview a square that cannot outgrow the cell', () => {
    expect(
      resolveSwimlaneQuickAddPreviewLayout({ band, horizontal, kind: 'note' })
    ).toEqual({
      height: '48px',
      left: '10%',
      maxWidth: 'calc(8% - 4px)',
      top: '12px',
      width: '48px',
    });
  });

  it('lets a photo ghost keep its two-cell width', () => {
    expect(
      resolveSwimlaneQuickAddPreviewLayout({ band, horizontal, kind: 'image' })
    ).toEqual({ ...band, ...horizontal });
  });
});
