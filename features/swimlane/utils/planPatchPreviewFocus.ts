export function planPatchPreviewElementId(taskId: string): string {
  return `plan-patch-preview-${taskId}`;
}

export function revealPlanPatchElement(elementId: string): void {
  const node = document.getElementById(elementId);
  if (!node) {
    return;
  }
  const rect = node.getBoundingClientRect();
  const outside =
    rect.bottom <= 0 ||
    rect.top >= window.innerHeight ||
    rect.right <= 0 ||
    rect.left >= window.innerWidth;
  if (outside) {
    node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
