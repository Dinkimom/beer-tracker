import type { QuickAddDraftKind } from '@/features/task/components/TaskBar/components/quickAddMenu/types';
import type { SwimlanePlacementTool } from '@/lib/layers';
import type { SwimlaneBaselineLayoutMode } from '@/lib/swimlane/swimlaneBaselineLayoutMode';

/** Отступ капсулы от нижнего края доски. */
export const SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX = 24;

/** Высота капсулы: кнопка h-9 + py-1.5 + бордер. */
export const SWIMLANE_PLACEMENT_TOOLBAR_HEIGHT_PX = 50;

/** Зазор над стеком капсул, чтобы последняя строка не прижималась к тулбару. */
const SWIMLANE_PLACEMENT_TOOLBAR_CLEARANCE_PX = 24;

/** Компактная капсула агента: кнопка h-6 + py-1 + бордер и тень над боксом. */
const SWIMLANE_AGENT_PROPOSAL_TOOLBAR_HEIGHT_PX = 34;
const SWIMLANE_AGENT_PROPOSAL_TOOLBAR_SHADOW_PX = 16;
const SWIMLANE_AGENT_PROPOSAL_TOOLBAR_STACK_PX =
  SWIMLANE_AGENT_PROPOSAL_TOOLBAR_HEIGHT_PX + 8 + SWIMLANE_AGENT_PROPOSAL_TOOLBAR_SHADOW_PX;

/**
 * Минимальный футер скролла. Место под капсулу агента заложено всегда:
 * она появляется над инструментами и иначе садится на последнюю строку.
 */
export const SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX =
  SWIMLANE_PLACEMENT_TOOLBAR_INSET_PX +
  SWIMLANE_PLACEMENT_TOOLBAR_HEIGHT_PX +
  SWIMLANE_AGENT_PROPOSAL_TOOLBAR_STACK_PX +
  SWIMLANE_PLACEMENT_TOOLBAR_CLEARANCE_PX;

/** Капсула «Принять всё» видна и без заметок: превью позиций и целей спринта. */
export function isAgentProposalToolbarVisible(input: {
  goalPreviewCount: number;
  hasPendingAgentNote: boolean;
  positionPreviewCount: number;
}): boolean {
  return (
    input.hasPendingAgentNote || input.positionPreviewCount > 0 || input.goalPreviewCount > 0
  );
}

/** Черновик плана — вторая капсула над уже заложенным местом агента. */
export function countPlacementToolbarExtras(planDraftCount: number): number {
  return planDraftCount > 0 ? 1 : 0;
}

export function resolvePlacementToolbarScrollPadPx(extraToolbarCount: number): number {
  if (extraToolbarCount <= 0) {
    return SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX;
  }
  return (
    SWIMLANE_PLACEMENT_TOOLBAR_SCROLL_PAD_PX +
    extraToolbarCount * SWIMLANE_AGENT_PROPOSAL_TOOLBAR_STACK_PX
  );
}

/** На общей строке нет отсутствия — оно привязано к человеку. Курсор и связь ничего не ставят. */
export function canQuickAddOnSwimlaneLane(input: {
  isTeamLane: boolean;
  placementTool: SwimlanePlacementTool;
}): boolean {
  if (input.placementTool === 'cursor' || input.placementTool === 'link') {
    return false;
  }
  return !input.isTeamLane || input.placementTool !== 'availability';
}

export function placementToolToDraftKind(
  tool: SwimlanePlacementTool
): QuickAddDraftKind | undefined {
  if (
    tool === 'cursor' ||
    tool === 'link' ||
    tool === 'task' ||
    tool === 'availability' ||
    tool === 'tictactoe'
  ) {
    return undefined;
  }
  return tool;
}

export const SWIMLANE_PLACEMENT_TOOLS: readonly SwimlanePlacementTool[] = [
  'cursor',
  'link',
  'task',
  'comment',
  'image',
  'diagram',
  'tictactoe',
  'availability',
];

export const SWIMLANE_CARD_PLACEMENT_TOOLS = ['image', 'diagram', 'tictactoe'] as const;

export type SwimlaneCardPlacementTool = (typeof SWIMLANE_CARD_PLACEMENT_TOOLS)[number];

export function isSwimlaneCardPlacementTool(
  tool: SwimlanePlacementTool
): tool is SwimlaneCardPlacementTool {
  return (SWIMLANE_CARD_PLACEMENT_TOOLS as readonly string[]).includes(tool);
}

/** После постановки карточки штамп выключается. Фото и схема оставляют открытый черновик. */
export function releaseCardPlacementTool(input: {
  activeTool: SwimlanePlacementTool;
  keepInlineCardDraftRef: { current: boolean };
  placed: boolean;
  placementTool: SwimlanePlacementTool;
  setPlacementTool: (tool: SwimlanePlacementTool) => void;
}): void {
  if (!input.placed || !isSwimlaneCardPlacementTool(input.placementTool)) {
    return;
  }
  if (input.placementTool === 'image' || input.placementTool === 'diagram') {
    input.keepInlineCardDraftRef.current = true;
  }
  if (input.activeTool === input.placementTool) {
    input.setPlacementTool('cursor');
  }
}

type SwimlaneBoardLayer = 'images' | 'links' | 'notes';

/** Слои доски + оверлеи под свимлейном (факт, календарь). */
export type SwimlaneVisibilityLayer = SwimlaneBoardLayer | 'calendar' | 'fact';

export interface SwimlaneVisibilityLayerState {
  calendarVisible: boolean;
  factVisible: boolean;
  imagesVisible: boolean;
  linksVisible: boolean;
  notesVisible: boolean;
}

/** Штампы на доске, затем оверлеи под строкой. */
export const SWIMLANE_VISIBILITY_LAYER_GROUPS: readonly (readonly SwimlaneVisibilityLayer[])[] = [
  ['notes', 'images', 'links'],
  ['fact', 'calendar'],
];

type SwimlaneVisibilityLayerMenuRow =
  | { kind: 'layer'; layer: SwimlaneVisibilityLayer }
  | { kind: 'separator' };

export function resolvePlacementToolbarTools(input: {
  hidePersonBoundTools?: boolean;
}): readonly SwimlanePlacementTool[] {
  if (!input.hidePersonBoundTools) {
    return SWIMLANE_PLACEMENT_TOOLS;
  }
  return SWIMLANE_PLACEMENT_TOOLS.filter((tool) => tool !== 'availability');
}

/** Фото и схемы пишутся в object storage (S3); без него инструменты только disabled. */
export function placementToolRequiresObjectStorage(tool: SwimlanePlacementTool): boolean {
  return tool === 'image' || tool === 'diagram';
}

export function isPlacementToolbarToolSelectable(
  tool: SwimlanePlacementTool,
  objectStorageConfigured: boolean
): boolean {
  return objectStorageConfigured || !placementToolRequiresObjectStorage(tool);
}

export function resolveArmedCardPlacementTool(
  remembered: SwimlaneCardPlacementTool,
  objectStorageConfigured: boolean
): SwimlaneCardPlacementTool {
  if (isPlacementToolbarToolSelectable(remembered, objectStorageConfigured)) {
    return remembered;
  }
  return 'tictactoe';
}

export function resolveVisibilityLayerMenuRows(input: {
  calendarAvailable: boolean;
  personBoundLayersAvailable?: boolean;
}): SwimlaneVisibilityLayerMenuRow[] {
  return SWIMLANE_VISIBILITY_LAYER_GROUPS.flatMap((group, groupIndex) => {
    const layers: SwimlaneVisibilityLayerMenuRow[] = [];
    for (const layer of group) {
      if (!input.calendarAvailable && layer === 'calendar') {
        continue;
      }
      if (input.personBoundLayersAvailable === false && (layer === 'calendar' || layer === 'fact')) {
        continue;
      }
      layers.push({ kind: 'layer', layer });
    }
    if (layers.length === 0) {
      return [];
    }
    if (groupIndex === 0) {
      return layers;
    }
    return [{ kind: 'separator' }, ...layers];
  });
}

export function placementToolLayerToReveal(
  tool: SwimlanePlacementTool
): SwimlaneBoardLayer | null {
  if (tool === 'comment' || tool === 'diagram' || tool === 'tictactoe') {
    return 'notes';
  }
  if (tool === 'image') {
    return 'images';
  }
  if (tool === 'link') {
    return 'links';
  }
  return null;
}

export function placementToolbarLayerLabelMessageKey(
  layer: SwimlaneVisibilityLayer
): 'layerCalendar' | 'layerFactTimeline' | 'layerImages' | 'layerLinks' | 'layerNotes' {
  if (layer === 'notes') {
    return 'layerNotes';
  }
  if (layer === 'images') {
    return 'layerImages';
  }
  if (layer === 'links') {
    return 'layerLinks';
  }
  if (layer === 'fact') {
    return 'layerFactTimeline';
  }
  return 'layerCalendar';
}

export function placementToolbarLayoutModeMessageKey(
  mode: SwimlaneBaselineLayoutMode
): 'layoutCompact' | 'layoutNoOverlap' {
  return mode === 'compact' ? 'layoutCompact' : 'layoutNoOverlap';
}

const LAYOUT_SUBMENU_GAP_PX = 4;
const LAYOUT_SUBMENU_VIEWPORT_PAD_PX = 10;

/** Справа от меню слоёв; влево — только если справа не помещается. */
export function resolveLayoutModeSubmenuViewportPosition(input: {
  buttonTop: number;
  menuLeft: number;
  menuRight: number;
  submenuHeight: number;
  submenuWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}): { left: number; top: number } {
  let left = input.menuRight + LAYOUT_SUBMENU_GAP_PX;
  if (left + input.submenuWidth > input.viewportWidth - LAYOUT_SUBMENU_VIEWPORT_PAD_PX) {
    left = input.menuLeft - input.submenuWidth - LAYOUT_SUBMENU_GAP_PX;
  }
  if (left < LAYOUT_SUBMENU_VIEWPORT_PAD_PX) {
    left = LAYOUT_SUBMENU_VIEWPORT_PAD_PX;
  }
  let top = input.buttonTop;
  const maxTop = input.viewportHeight - LAYOUT_SUBMENU_VIEWPORT_PAD_PX - input.submenuHeight;
  if (top > maxTop) {
    top = Math.max(LAYOUT_SUBMENU_VIEWPORT_PAD_PX, maxTop);
  }
  if (top < LAYOUT_SUBMENU_VIEWPORT_PAD_PX) {
    top = LAYOUT_SUBMENU_VIEWPORT_PAD_PX;
  }
  return { left, top };
}

export function placementToolbarLayerIconName(
  layer: Exclude<SwimlaneVisibilityLayer, 'links' | 'notes'>
): 'bar-chart' | 'calendar' | 'image' {
  if (layer === 'images') {
    return 'image';
  }
  if (layer === 'fact') {
    return 'bar-chart';
  }
  return 'calendar';
}

export function resolveVisibilityLayerVisible(
  layer: SwimlaneVisibilityLayer,
  state: SwimlaneVisibilityLayerState
): boolean {
  if (layer === 'notes') {
    return state.notesVisible;
  }
  if (layer === 'images') {
    return state.imagesVisible;
  }
  if (layer === 'links') {
    return state.linksVisible;
  }
  if (layer === 'fact') {
    return state.factVisible;
  }
  return state.calendarVisible;
}

export function applyVisibilityLayerToggle(
  layer: SwimlaneVisibilityLayer,
  state: SwimlaneVisibilityLayerState,
  setters: {
    setCalendarVisible: (visible: boolean) => void;
    setFactVisible: (visible: boolean) => void;
    setImagesVisible: (visible: boolean) => void;
    setLinksVisible: (visible: boolean) => void;
    setNotesVisible: (visible: boolean) => void;
  }
): void {
  if (layer === 'notes') {
    setters.setNotesVisible(!state.notesVisible);
    return;
  }
  if (layer === 'images') {
    setters.setImagesVisible(!state.imagesVisible);
    return;
  }
  if (layer === 'links') {
    setters.setLinksVisible(!state.linksVisible);
    return;
  }
  if (layer === 'fact') {
    setters.setFactVisible(!state.factVisible);
    return;
  }
  setters.setCalendarVisible(!state.calendarVisible);
}

export function resolvePlacementToolAfterLayerChange(
  tool: SwimlanePlacementTool,
  input: { imagesVisible: boolean; linksVisible: boolean; notesVisible: boolean }
): SwimlanePlacementTool {
  if ((tool === 'comment' || tool === 'diagram' || tool === 'tictactoe') && !input.notesVisible) {
    return 'cursor';
  }
  if (tool === 'image' && !input.imagesVisible) {
    return 'cursor';
  }
  if (tool === 'link' && !input.linksVisible) {
    return 'cursor';
  }
  return tool;
}

/** Инструменты, которые Escape возвращает в курсор (кроме самого курсора). */
const ESCAPE_EXITABLE_PLACEMENT_TOOLS = new Set<SwimlanePlacementTool>([
  'availability',
  'comment',
  'diagram',
  'image',
  'link',
  'task',
  'tictactoe',
]);

export function shouldExitPlacementToolOnEscape(input: {
  defaultPrevented?: boolean;
  fromEditableTarget?: boolean;
  hasBlockingOverlay?: boolean;
  key: string;
  placementTool: SwimlanePlacementTool;
}): boolean {
  if (input.key !== 'Escape' || input.defaultPrevented) {
    return false;
  }
  if (input.fromEditableTarget || input.hasBlockingOverlay) {
    return false;
  }
  return ESCAPE_EXITABLE_PLACEMENT_TOOLS.has(input.placementTool);
}

/** После сохранения или отмены поповера отсутствия выходим из режима выставления. */
export function resolvePlacementToolAfterAvailabilityPopoverClose(
  tool: SwimlanePlacementTool
): SwimlanePlacementTool {
  if (tool === 'availability') {
    return 'cursor';
  }
  return tool;
}

export function toggleSwimlanePlacementTool(
  current: SwimlanePlacementTool,
  next: SwimlanePlacementTool
): SwimlanePlacementTool {
  if (next === 'cursor') {
    return 'cursor';
  }
  if (next === 'comment') {
    return 'comment';
  }
  return current === next ? 'cursor' : next;
}

export function resolveNoteColorPopupOpen(input: {
  commentWasActive: boolean;
  popupWasOpen: boolean;
  selectedTool: SwimlanePlacementTool;
}): boolean {
  if (input.selectedTool !== 'comment') {
    return false;
  }
  return input.commentWasActive ? !input.popupWasOpen : true;
}
