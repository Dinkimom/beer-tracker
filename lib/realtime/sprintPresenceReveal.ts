export const SPRINT_PRESENCE_REVEAL_CLASS = 'sprint-card-presence-reveal';
export const SPRINT_PRESENCE_REVEAL_RETRY_MS = 80;
export const SPRINT_PRESENCE_REVEAL_TIMEOUT_MS = 2500;
export const SPRINT_PRESENCE_REVEAL_HIGHLIGHT_MS = 1400;

export function querySprintPresenceTargetElement(
  root: ParentNode,
  taskId: string
): HTMLElement | null {
  const matches = root.querySelectorAll('[data-task-id]');
  for (const node of matches) {
    if (node instanceof HTMLElement && node.getAttribute('data-task-id') === taskId) {
      return node;
    }
  }
  return null;
}

export function revealSprintPresenceTargetElement(element: HTMLElement): void {
  element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  element.classList.add(SPRINT_PRESENCE_REVEAL_CLASS);
}

export function clearSprintPresenceRevealClass(element: HTMLElement): void {
  element.classList.remove(SPRINT_PRESENCE_REVEAL_CLASS);
}
