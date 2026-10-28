interface StickyNoteTextSegment {
  type: 'text';
  value: string;
}

function isTextSegment(segment: { type: string }): segment is StickyNoteTextSegment {
  return segment.type === 'text';
}

/** Склеивает соседние текстовые сегменты после разбиения заметки на ссылки, упоминания, ключи задач. */
export function mergeAdjacentTextSegments<S extends { type: string }>(segments: S[]): S[] {
  const merged: S[] = [];
  for (const segment of segments) {
    const previous = merged.at(-1);
    if (isTextSegment(segment) && previous && isTextSegment(previous)) {
      previous.value += segment.value;
      continue;
    }
    merged.push(segment);
  }
  return merged;
}
