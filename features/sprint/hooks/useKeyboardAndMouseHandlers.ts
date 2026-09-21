/**
 * Placeholder for keyboard/mouse handlers in the sprint planner.
 * Delete-key task/link removal will return with the new selection model.
 */

import type { TaskLink, TaskPosition } from '@/types';

interface UseKeyboardAndMouseHandlersProps {
  filteredTaskLinks: TaskLink[];
  filteredTaskPositions: Map<string, TaskPosition>;
  selectedSprintId: number | null;
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  setTaskLinks: (updater: (prev: TaskLink[]) => TaskLink[]) => void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
}

export function useKeyboardAndMouseHandlers(_props: UseKeyboardAndMouseHandlersProps): void {
  // Intentionally empty until selection-based keyboard actions are restored.
}
