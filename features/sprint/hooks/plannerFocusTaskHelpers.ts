import { getSwimlanePlanSegmentHtmlAnchorId } from '@/features/swimlane/utils/task-arrows/swimlaneSegmentArrowHelpers';
import { DELAYS } from '@/utils/constants';

export const PLANNER_NOTIFICATION_FOCUS_MS = 4000;

export function resolvePlannerTaskHtmlAnchorId(taskId: string): string {
  return getSwimlanePlanSegmentHtmlAnchorId(taskId, 0);
}

export function computePlannerScrollOffsetsForElement(
  container: HTMLDivElement,
  element: HTMLElement
): { scrollLeft: number; scrollTop: number } {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const elementLeft = elementRect.left - containerRect.left + container.scrollLeft;
  const elementTop = elementRect.top - containerRect.top + container.scrollTop;

  const scrollLeft = Math.max(
    0,
    Math.min(
      elementLeft + elementRect.width / 2 - container.clientWidth / 2,
      container.scrollWidth - container.clientWidth
    )
  );
  const scrollTop = Math.max(
    0,
    Math.min(
      elementTop + elementRect.height / 2 - container.clientHeight / 2,
      container.scrollHeight - container.clientHeight
    )
  );
  return { scrollLeft, scrollTop };
}

function scrollPlannerContainerToTaskElement(
  container: HTMLDivElement,
  taskElement: HTMLElement
): void {
  const { scrollLeft, scrollTop } = computePlannerScrollOffsetsForElement(container, taskElement);
  container.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'smooth' });
}

export function tryScrollPlannerToTaskElement(input: {
  container: HTMLDivElement | null;
  focusTaskId: string;
  onFound: (taskElement: HTMLElement) => void;
  onGiveUp: () => void;
  attempt?: number;
}): void {
  const attempt = input.attempt ?? 0;
  const container = input.container;
  if (!container) {
    if (attempt < DELAYS.MAX_RETRIES) {
      setTimeout(
        () => tryScrollPlannerToTaskElement({ ...input, attempt: attempt + 1 }),
        DELAYS.SCROLL_ATTEMPT
      );
      return;
    }
    input.onGiveUp();
    return;
  }

  const anchorId = resolvePlannerTaskHtmlAnchorId(input.focusTaskId);
  const taskElement = document.getElementById(anchorId);
  if (!taskElement) {
    if (attempt < DELAYS.MAX_RETRIES) {
      setTimeout(
        () => tryScrollPlannerToTaskElement({ ...input, attempt: attempt + 1 }),
        DELAYS.SCROLL_ATTEMPT
      );
      return;
    }
    input.onGiveUp();
    return;
  }

  scrollPlannerContainerToTaskElement(container, taskElement);
  input.onFound(taskElement);
}
