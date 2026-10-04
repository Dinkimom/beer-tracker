function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function elementRevisionToken(element: unknown): string {
  if (!isRecord(element) || typeof element.id !== 'string') {
    return JSON.stringify(element);
  }
  const version = typeof element.version === 'number' ? element.version : 0;
  const deleted = element.isDeleted === true ? '1' : '0';
  return `${element.id}:${version}:${deleted}`;
}

function filesRevision(files: Record<string, unknown> | null | undefined): string {
  if (!files) {
    return '';
  }
  return Object.keys(files)
    .sort()
    .map((id) => {
      const file = files[id];
      const dataUrlLength =
        isRecord(file) && typeof file.dataURL === 'string' ? file.dataURL.length : 0;
      return `${id}:${dataUrlLength}`;
    })
    .join(',');
}

/** Отпечаток холста: фигуры, фон и файлы. Камера и выделение сюда не входят. */
export function diagramCanvasRevisionKey(input: {
  elements: readonly unknown[];
  files?: Record<string, unknown> | null;
  viewBackgroundColor?: unknown;
}): string {
  const background =
    typeof input.viewBackgroundColor === 'string' ? input.viewBackgroundColor : '';
  const elements = input.elements.map(elementRevisionToken).join('\n');
  return `${background}\n${filesRevision(input.files)}\n${elements}`;
}

export function isDiagramEditorDirty(input: {
  canvasRevision: string | null;
  initialName?: string;
  nameDraft: string;
  savedCanvasRevision: string | null;
}): boolean {
  if (input.nameDraft.trim() !== (input.initialName?.trim() ?? '')) {
    return true;
  }
  if (input.savedCanvasRevision == null || input.canvasRevision == null) {
    return false;
  }
  return input.canvasRevision !== input.savedCanvasRevision;
}
