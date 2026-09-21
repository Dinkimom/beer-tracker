import { DELAYS } from '@/utils/constants';

function isTodayOutsideSprintRange(sprintInfo: { startDate?: string; endDate?: string }): boolean {
  if (!sprintInfo.startDate || !sprintInfo.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(sprintInfo.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(sprintInfo.endDate);
  endDate.setHours(23, 59, 59, 999);
  return today < startDate || today > endDate;
}

export function shouldSkipScrollToCurrentDay(input: {
  hasScrolled: boolean;
  selectedSprint: { archived?: boolean; status?: string } | undefined;
  sprintInfo: { startDate?: string; endDate?: string } | null;
}): boolean {
  if (input.hasScrolled) return true;
  if (input.selectedSprint && (input.selectedSprint.archived || input.selectedSprint.status === 'draft')) {
    return true;
  }
  if (input.sprintInfo && isTodayOutsideSprintRange(input.sprintInfo)) {
    return true;
  }
  return false;
}

export function scrollContainerToCurrentCell(
  container: HTMLDivElement,
  attempt: number,
  onComplete: () => void
): void {
  const currentCellElement = container.querySelector('[data-current-cell="true"]') as HTMLElement | null;
  if (!currentCellElement) {
    if (attempt < DELAYS.MAX_RETRIES) {
      setTimeout(() => scrollContainerToCurrentCell(container, attempt + 1, onComplete), DELAYS.SCROLL_ATTEMPT);
      return;
    }
    onComplete();
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elementRect = currentCellElement.getBoundingClientRect();
  const elementLeft = elementRect.left - containerRect.left + container.scrollLeft;
  const elementWidth = elementRect.width;
  const containerWidth = container.clientWidth;
  const scrollOffset = Math.max(
    0,
    Math.min(elementLeft + elementWidth / 2 - containerWidth / 2, container.scrollWidth - containerWidth)
  );

  container.scrollLeft = scrollOffset;
  requestAnimationFrame(() => {
    container.scrollTo({ left: scrollOffset, behavior: 'smooth' });
  });
  onComplete();
}
