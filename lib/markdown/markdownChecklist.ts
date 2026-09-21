export function isMarkdownCheckboxLine(line: string): boolean {
  return parseMarkdownCheckboxLine(line) != null;
}

export function parseMarkdownCheckboxLine(line: string): {
  checked: boolean;
  text: string;
} | null {
  const leading = line.match(/^\s*/)?.[0] ?? '';
  let rest = line.slice(leading.length);

  const bulletMatch = rest.match(/^[-*+]\s+/);
  if (bulletMatch) {
    rest = rest.slice(bulletMatch[0].length);
  } else {
    const numberedMatch = rest.match(/^\d+\.\s+/);
    if (numberedMatch) {
      rest = rest.slice(numberedMatch[0].length);
    }
  }

  if (!rest.startsWith('[')) {
    return null;
  }

  const closeIdx = rest.indexOf(']');
  if (closeIdx < 1 || closeIdx > 3) {
    return null;
  }

  const inside = rest.slice(1, closeIdx);
  if (inside.length > 1) {
    return null;
  }
  if (inside !== '' && inside !== ' ' && inside.toLowerCase() !== 'x') {
    return null;
  }

  return {
    checked: inside.toLowerCase() === 'x',
    text: rest.slice(closeIdx + 1).trimStart(),
  };
}

/** Line indices (0-based) of checkbox items, in document order. */
export function collectMarkdownCheckboxLineIndices(markdown: string): number[] {
  const indices: number[] = [];
  markdown.split('\n').forEach((line, index) => {
    if (isMarkdownCheckboxLine(line)) {
      indices.push(index);
    }
  });
  return indices;
}

export function toggleMarkdownCheckboxAtLine(markdown: string, lineIndex: number): string {
  const lines = markdown.split('\n');
  const line = lines[lineIndex];
  if (line == null) {
    return markdown;
  }

  const parsed = parseMarkdownCheckboxLine(line);
  if (!parsed) {
    return markdown;
  }

  const openIdx = line.indexOf('[');
  const closeIdx = line.indexOf(']', openIdx);
  if (openIdx < 0 || closeIdx < 0) {
    return markdown;
  }

  const nextInside = parsed.checked ? ' ' : 'x';
  lines[lineIndex] = `${line.slice(0, openIdx + 1)}${nextInside}${line.slice(closeIdx)}`;
  return lines.join('\n');
}

export function countMarkdownChecklistProgress(markdown: string): {
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;

  for (const line of markdown.split('\n')) {
    const parsed = parseMarkdownCheckboxLine(line);
    if (!parsed) {
      continue;
    }
    total += 1;
    if (parsed.checked) {
      done += 1;
    }
  }

  return { done, total };
}

function stickyNoteHasCheckboxLines(text: string): boolean {
  return text.split('\n').some((line) => isMarkdownCheckboxLine(line));
}

/** Sticky-note body uses markdown layout (headings and/or checklists). */
export function stickyNoteUsesMarkdownLayout(text: string): boolean {
  return stickyNoteHasCheckboxLines(text) || text.split('\n').some((line) => isMarkdownHeadingLine(line));
}

function isMarkdownHeadingLine(line: string): boolean {
  if (!line.startsWith('#')) {
    return false;
  }

  let level = 0;
  while (level < line.length && line[level] === '#') {
    level += 1;
  }

  return level >= 1 && level <= 3 && line[level] === ' ';
}
