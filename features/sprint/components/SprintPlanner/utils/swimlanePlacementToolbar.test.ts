import { describe, expect, it, vi } from 'vitest';

import {
  SWIMLANE_PLACEMENT_TOOLBAR_HEIGHT_PX,
  SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX,
  SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX,
  SWIMLANE_PLACEMENT_TOOLS,
  SWIMLANE_VISIBILITY_LAYER_GROUPS,
  applyVisibilityLayerToggle,
  canQuickAddOnSwimlaneLane,
  placementToolbarLayerIconName,
  placementToolbarLayerLabelMessageKey,
  placementToolbarLayoutModeMessageKey,
  placementToolLayerToReveal,
  placementToolToDraftKind,
  resolvePlacementToolAfterLayerChange,
  resolveNoteColorPopupOpen,
  resolveLayoutModeSubmenuViewportPosition,
  resolvePlacementToolbarTools,
  resolveVisibilityLayerMenuRows,
  resolveVisibilityLayerVisible,
  shouldExitPlacementToolOnEscape,
  toggleSwimlanePlacementTool,
} from './swimlanePlacementToolbar';

describe('SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX', () => {
  it('leaves room for the capsule plus a gap above the last swimlane row', () => {
    expect(SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX).toBeGreaterThan(
      SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX + SWIMLANE_PLACEMENT_TOOLBAR_HEIGHT_PX
    );
  });
});

describe('canQuickAddOnSwimlaneLane', () => {
  it('hides + in cursor mode on every row', () => {
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: false, placementTool: 'cursor' })).toBe(false);
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: true, placementTool: 'cursor' })).toBe(false);
  });

  it('hides + while drawing links', () => {
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: false, placementTool: 'link' })).toBe(false);
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: true, placementTool: 'link' })).toBe(false);
  });

  it('keeps + on a person row in create modes', () => {
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: false, placementTool: 'task' })).toBe(true);
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: false, placementTool: 'comment' })).toBe(true);
  });

  it('keeps + on the shared row except when adding time off', () => {
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: true, placementTool: 'task' })).toBe(true);
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: true, placementTool: 'comment' })).toBe(true);
    expect(canQuickAddOnSwimlaneLane({ isTeamLane: true, placementTool: 'availability' })).toBe(
      false
    );
  });
});

describe('placementToolToDraftKind', () => {
  it('leaves the cell chooser open for task and time off', () => {
    expect(placementToolToDraftKind('cursor')).toBeUndefined();
    expect(placementToolToDraftKind('link')).toBeUndefined();
    expect(placementToolToDraftKind('task')).toBeUndefined();
    expect(placementToolToDraftKind('availability')).toBeUndefined();
    expect(placementToolToDraftKind('comment')).toBe('comment');
    expect(placementToolToDraftKind('image')).toBe('image');
  });
});

describe('SWIMLANE_PLACEMENT_TOOLS', () => {
  it('keeps every stamp in the capsule regardless of layer visibility', () => {
    expect(SWIMLANE_PLACEMENT_TOOLS).toEqual([
      'cursor',
      'link',
      'task',
      'comment',
      'image',
      'diagram',
      'availability',
    ]);
  });
});

describe('shouldExitPlacementToolOnEscape', () => {
  it('exits placement tools other than cursor', () => {
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'link' })).toBe(true);
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'comment' })).toBe(true);
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'diagram' })).toBe(true);
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'image' })).toBe(true);
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'task' })).toBe(true);
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'availability' })).toBe(
      true
    );
  });

  it('keeps the cursor tool', () => {
    expect(shouldExitPlacementToolOnEscape({ key: 'Escape', placementTool: 'cursor' })).toBe(false);
  });

  it('ignores Escape while typing or when an overlay already owns it', () => {
    expect(
      shouldExitPlacementToolOnEscape({
        fromEditableTarget: true,
        key: 'Escape',
        placementTool: 'task',
      })
    ).toBe(false);
    expect(
      shouldExitPlacementToolOnEscape({
        hasBlockingOverlay: true,
        key: 'Escape',
        placementTool: 'comment',
      })
    ).toBe(false);
    expect(
      shouldExitPlacementToolOnEscape({
        defaultPrevented: true,
        key: 'Escape',
        placementTool: 'image',
      })
    ).toBe(false);
    expect(shouldExitPlacementToolOnEscape({ key: 'Enter', placementTool: 'diagram' })).toBe(false);
  });
});

describe('toggleSwimlanePlacementTool', () => {
  it('keeps the note tool active when it is pressed again', () => {
    expect(toggleSwimlanePlacementTool('comment', 'comment')).toBe('comment');
    expect(toggleSwimlanePlacementTool('cursor', 'comment')).toBe('comment');
  });

  it('returns to cursor when another active create tool is pressed again', () => {
    expect(toggleSwimlanePlacementTool('cursor', 'diagram')).toBe('diagram');
    expect(toggleSwimlanePlacementTool('diagram', 'task')).toBe('task');
    expect(toggleSwimlanePlacementTool('task', 'cursor')).toBe('cursor');
    expect(toggleSwimlanePlacementTool('cursor', 'cursor')).toBe('cursor');
    expect(toggleSwimlanePlacementTool('task', 'task')).toBe('cursor');
    expect(toggleSwimlanePlacementTool('link', 'link')).toBe('cursor');
  });
});

describe('resolveNoteColorPopupOpen', () => {
  it('opens the color popup when entering the note tool', () => {
    expect(
      resolveNoteColorPopupOpen({
        commentWasActive: false,
        popupWasOpen: false,
        selectedTool: 'comment',
      })
    ).toBe(true);
  });

  it('toggles the color popup while the note tool stays active', () => {
    expect(
      resolveNoteColorPopupOpen({
        commentWasActive: true,
        popupWasOpen: true,
        selectedTool: 'comment',
      })
    ).toBe(false);
    expect(
      resolveNoteColorPopupOpen({
        commentWasActive: true,
        popupWasOpen: false,
        selectedTool: 'comment',
      })
    ).toBe(true);
  });

  it('closes the color popup when another tool is selected', () => {
    expect(
      resolveNoteColorPopupOpen({
        commentWasActive: true,
        popupWasOpen: true,
        selectedTool: 'task',
      })
    ).toBe(false);
  });
});

describe('resolvePlacementToolAfterLayerChange', () => {
  it('falls back to cursor when the selected layer is hidden', () => {
    expect(
      resolvePlacementToolAfterLayerChange('comment', {
        imagesVisible: true,
        linksVisible: true,
        notesVisible: false,
      })
    ).toBe('cursor');
    expect(
      resolvePlacementToolAfterLayerChange('image', {
        imagesVisible: false,
        linksVisible: true,
        notesVisible: true,
      })
    ).toBe('cursor');
    expect(
      resolvePlacementToolAfterLayerChange('link', {
        imagesVisible: true,
        linksVisible: false,
        notesVisible: true,
      })
    ).toBe('cursor');
    expect(
      resolvePlacementToolAfterLayerChange('task', {
        imagesVisible: false,
        linksVisible: false,
        notesVisible: false,
      })
    ).toBe('task');
    expect(
      resolvePlacementToolAfterLayerChange('cursor', {
        imagesVisible: false,
        linksVisible: false,
        notesVisible: false,
      })
    ).toBe('cursor');
  });
});

describe('resolveVisibilityLayerMenuRows', () => {
  it('puts stamp layers above fact and calendar overlays', () => {
    expect(SWIMLANE_VISIBILITY_LAYER_GROUPS).toEqual([
      ['notes', 'images', 'links'],
      ['fact', 'calendar'],
    ]);
    expect(resolveVisibilityLayerMenuRows({ calendarAvailable: true })).toEqual([
      { kind: 'layer', layer: 'notes' },
      { kind: 'layer', layer: 'images' },
      { kind: 'layer', layer: 'links' },
      { kind: 'separator' },
      { kind: 'layer', layer: 'fact' },
      { kind: 'layer', layer: 'calendar' },
    ]);
  });

  it('hides calendar when CalDAV is not configured', () => {
    expect(resolveVisibilityLayerMenuRows({ calendarAvailable: false })).toEqual([
      { kind: 'layer', layer: 'notes' },
      { kind: 'layer', layer: 'images' },
      { kind: 'layer', layer: 'links' },
      { kind: 'separator' },
      { kind: 'layer', layer: 'fact' },
    ]);
  });

  it('hides person-bound overlays on the feature board', () => {
    expect(
      resolveVisibilityLayerMenuRows({
        calendarAvailable: true,
        personBoundLayersAvailable: false,
      })
    ).toEqual([
      { kind: 'layer', layer: 'notes' },
      { kind: 'layer', layer: 'images' },
      { kind: 'layer', layer: 'links' },
    ]);
  });
});

describe('resolvePlacementToolbarTools', () => {
  it('keeps time-off only on people swimlanes', () => {
    expect(resolvePlacementToolbarTools({})).toEqual(SWIMLANE_PLACEMENT_TOOLS);
    expect(resolvePlacementToolbarTools({ hidePersonBoundTools: true })).toEqual([
      'cursor',
      'link',
      'task',
      'comment',
      'image',
      'diagram',
    ]);
  });
});

describe('placementToolbarLayerLabelMessageKey', () => {
  it('names each visibility layer', () => {
    expect(placementToolbarLayerLabelMessageKey('notes')).toBe('layerNotes');
    expect(placementToolbarLayerLabelMessageKey('images')).toBe('layerImages');
    expect(placementToolbarLayerLabelMessageKey('links')).toBe('layerLinks');
    expect(placementToolbarLayerLabelMessageKey('fact')).toBe('layerFactTimeline');
    expect(placementToolbarLayerLabelMessageKey('calendar')).toBe('layerCalendar');
  });
});

describe('placementToolbarLayoutModeMessageKey', () => {
  it('names compact and no-overlap packing', () => {
    expect(placementToolbarLayoutModeMessageKey('compact')).toBe('layoutCompact');
    expect(placementToolbarLayoutModeMessageKey('noOverlap')).toBe('layoutNoOverlap');
  });
});

describe('resolveLayoutModeSubmenuViewportPosition', () => {
  it('opens to the right of the layers menu when there is room', () => {
    expect(
      resolveLayoutModeSubmenuViewportPosition({
        buttonTop: 400,
        menuLeft: 400,
        menuRight: 640,
        submenuHeight: 80,
        submenuWidth: 200,
        viewportHeight: 800,
        viewportWidth: 1200,
      })
    ).toEqual({ left: 644, top: 400 });
  });

  it('flips to the left only when the right side overflows', () => {
    expect(
      resolveLayoutModeSubmenuViewportPosition({
        buttonTop: 400,
        menuLeft: 900,
        menuRight: 1140,
        submenuHeight: 80,
        submenuWidth: 200,
        viewportHeight: 800,
        viewportWidth: 1200,
      })
    ).toEqual({ left: 696, top: 400 });
  });
});

describe('placementToolbarLayerIconName', () => {
  it('maps overlay and stamp layers to icons', () => {
    expect(placementToolbarLayerIconName('images')).toBe('image');
    expect(placementToolbarLayerIconName('fact')).toBe('bar-chart');
    expect(placementToolbarLayerIconName('calendar')).toBe('calendar');
  });
});

describe('resolveVisibilityLayerVisible', () => {
  const visible = {
    calendarVisible: true,
    factVisible: false,
    imagesVisible: true,
    linksVisible: false,
    notesVisible: false,
  };

  it('reads the matching overlay or stamp flag', () => {
    expect(resolveVisibilityLayerVisible('notes', visible)).toBe(false);
    expect(resolveVisibilityLayerVisible('images', visible)).toBe(true);
    expect(resolveVisibilityLayerVisible('links', visible)).toBe(false);
    expect(resolveVisibilityLayerVisible('fact', visible)).toBe(false);
    expect(resolveVisibilityLayerVisible('calendar', visible)).toBe(true);
  });
});

describe('applyVisibilityLayerToggle', () => {
  it('flips only the selected layer', () => {
    const setters = {
      setCalendarVisible: vi.fn(),
      setFactVisible: vi.fn(),
      setImagesVisible: vi.fn(),
      setLinksVisible: vi.fn(),
      setNotesVisible: vi.fn(),
    };
    const state = {
      calendarVisible: true,
      factVisible: false,
      imagesVisible: true,
      linksVisible: true,
      notesVisible: true,
    };
    applyVisibilityLayerToggle('notes', state, setters);
    applyVisibilityLayerToggle('images', state, setters);
    applyVisibilityLayerToggle('links', state, setters);
    applyVisibilityLayerToggle('fact', state, setters);
    applyVisibilityLayerToggle('calendar', state, setters);
    expect(setters.setNotesVisible).toHaveBeenCalledWith(false);
    expect(setters.setImagesVisible).toHaveBeenCalledWith(false);
    expect(setters.setLinksVisible).toHaveBeenCalledWith(false);
    expect(setters.setFactVisible).toHaveBeenCalledWith(true);
    expect(setters.setCalendarVisible).toHaveBeenCalledWith(false);
  });
});

describe('placementToolLayerToReveal', () => {
  it('turns the matching board layer back on when a stamp is selected', () => {
    expect(placementToolLayerToReveal('comment')).toBe('notes');
    expect(placementToolLayerToReveal('diagram')).toBe('notes');
    expect(placementToolLayerToReveal('image')).toBe('images');
    expect(placementToolLayerToReveal('link')).toBe('links');
    expect(placementToolLayerToReveal('task')).toBeNull();
    expect(placementToolLayerToReveal('cursor')).toBeNull();
  });
});
