export function planPatchPreviewElementId(taskId: string): string {
  return `plan-patch-preview-${taskId}`;
}

/** DOM id отрезка ghost-превью (как `task-…-seg-N` у реальных полос). */
export function planPatchPreviewSegmentHtmlAnchorId(taskId: string, segIdx: number): string {
  return segIdx > 0
    ? `${planPatchPreviewElementId(taskId)}-seg-${segIdx}`
    : planPatchPreviewElementId(taskId);
}
