import type { SwimlanePlacementTool } from '@/lib/layers';

import {
  SWIMLANE_PLACEMENT_TOOLS,
  shouldExitPlacementToolOnEscape,
} from '../utils/swimlanePlacementToolbar';

import { formatModKeyShortcutHint } from './plannerHistoryKeyboard';

const PLACEMENT_TOOL_SHORTCUT_MAX_DIGIT = SWIMLANE_PLACEMENT_TOOLS.length;

export function placementToolShortcutDigit(tool: SwimlanePlacementTool): string {
  return String(SWIMLANE_PLACEMENT_TOOLS.indexOf(tool) + 1);
}

export function formatPlacementToolShortcutHint(
  tool: SwimlanePlacementTool,
  userAgent?: string
): string {
  return formatModKeyShortcutHint(placementToolShortcutDigit(tool), userAgent);
}

function digitFromKeyboardCode(code: string): string | null {
  let prefixLength = 0;
  if (code.startsWith('Digit')) {
    prefixLength = 'Digit'.length;
  } else if (code.startsWith('Numpad')) {
    prefixLength = 'Numpad'.length;
  } else {
    return null;
  }
  const digit = code.slice(prefixLength);
  const index = Number(digit);
  if (!Number.isInteger(index) || index < 1 || index > PLACEMENT_TOOL_SHORTCUT_MAX_DIGIT) {
    return null;
  }
  return digit;
}

/**
 * Cmd/Ctrl+1…N → инструмент в том же порядке, что кнопки тулбара.
 * Shift/Alt игнорируем, чтобы не перехватывать системные сочетания.
 */
export function resolvePlacementToolShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'>,
  availableTools: readonly SwimlanePlacementTool[]
): SwimlanePlacementTool | null {
  if (event.altKey || event.shiftKey) {
    return null;
  }
  if (!event.metaKey && !event.ctrlKey) {
    return null;
  }
  const digit = digitFromKeyboardCode(event.code);
  if (!digit) {
    return null;
  }
  const tool = SWIMLANE_PLACEMENT_TOOLS[Number(digit) - 1];
  if (!tool || !availableTools.includes(tool)) {
    return null;
  }
  return tool;
}

export function resolvePlacementToolbarKeyboardAction(input: {
  availableTools: readonly SwimlanePlacementTool[];
  defaultPrevented: boolean;
  event: Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>;
  fromEditableTarget: boolean;
  hasBlockingOverlay: boolean;
  placementTool: SwimlanePlacementTool;
}): SwimlanePlacementTool | null {
  if (
    shouldExitPlacementToolOnEscape({
      defaultPrevented: input.defaultPrevented,
      fromEditableTarget: input.fromEditableTarget,
      hasBlockingOverlay: input.hasBlockingOverlay,
      key: input.event.key,
      placementTool: input.placementTool,
    })
  ) {
    return 'cursor';
  }
  if (input.defaultPrevented || input.fromEditableTarget || input.hasBlockingOverlay) {
    return null;
  }
  return resolvePlacementToolShortcut(input.event, input.availableTools);
}
