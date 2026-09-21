/**
 * Shared enter/exit classes for overlays.
 * Keyframes live in `app/globals.css`; `data-state` comes from Radix or `useOverlayPresence`.
 */

/** Radix Popover / Select. */
export const OVERLAY_FLOATING_ANIMATION = 'overlay-float';

/** Custom portal panel (settings popup, context menu, submenu). */
export const OVERLAY_PANEL_ENTER = 'overlay-panel';

/** Dimmed or transparent backdrop. */
export const OVERLAY_BACKDROP_ENTER = 'overlay-backdrop';

/**
 * Centered Dialog.Content (`left-1/2 top-1/2 -translate-*`).
 * Keyframes animate opacity/scale only — not translate (Tailwind v4 stacks `translate` + `transform`).
 */
export const OVERLAY_CENTERED_DIALOG_ANIMATION = 'overlay-dialog';

/** Tooltip: shorter fade + zoom. */
export const OVERLAY_TOOLTIP_ANIMATION = 'overlay-tooltip';
