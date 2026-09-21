type TrackerDescriptionSegment =
  | {
      borderColor: string;
      content: string;
      type: 'block';
    }
  | { content: string; type: 'markdown' };

const TRACKER_TAG_NAMES = [
  'layout',
  'endlayout',
  'cut',
  'endcut',
  'note',
  'endnote',
  'list',
  'endlist',
] as const;

/** Декодирует типичные HTML-сущности из описаний Tracker. */
export function decodeTrackerHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function parseBlockBorderColor(attrs: string): string {
  const key = 'borderColor=';
  const lowerAttrs = attrs.toLowerCase();
  const index = lowerAttrs.indexOf(key.toLowerCase());
  if (index < 0) {
    return 'info';
  }
  const valueStart = index + key.length;
  let valueEnd = valueStart;
  while (valueEnd < attrs.length) {
    const ch = attrs[valueEnd];
    if (!ch || /[\s%]/.test(ch)) {
      break;
    }
    if (!/[a-z0-9_-]/i.test(ch)) {
      break;
    }
    valueEnd += 1;
  }
  const value = attrs.slice(valueStart, valueEnd).trim().toLowerCase();
  return value || 'info';
}

function stripTrackerTags(raw: string): string {
  let result = '';
  let index = 0;
  while (index < raw.length) {
    const open = raw.indexOf('{%', index);
    if (open < 0) {
      result += raw.slice(index);
      break;
    }
    result += raw.slice(index, open);
    const after = raw.slice(open + 2);
    const tagMatch = /^\s*([a-zA-Z]+)\b[^%]*%}/.exec(after);
    if (!tagMatch) {
      result += '{%';
      index = open + 2;
      continue;
    }
    const tagName = tagMatch[1]?.toLowerCase() ?? '';
    if ((TRACKER_TAG_NAMES as readonly string[]).includes(tagName)) {
      index = open + 2 + tagMatch[0].length;
      continue;
    }
    result += raw.slice(open, open + 2 + tagMatch[0].length);
    index = open + 2 + tagMatch[0].length;
  }
  return result;
}

function normalizeSegmentMarkdown(raw: string): string {
  const withoutTags = stripTrackerTags(decodeTrackerHtmlEntities(raw));
  const lines = withoutTags.split('\n').map((line) => line.trimEnd());
  const collapsed: string[] = [];
  let emptyStreak = 0;
  for (const line of lines) {
    if (line.length === 0) {
      emptyStreak += 1;
      if (emptyStreak <= 1) {
        collapsed.push('');
      }
      continue;
    }
    emptyStreak = 0;
    collapsed.push(line);
  }
  return collapsed.join('\n').trim();
}

function pushMarkdownIfPresent(segments: TrackerDescriptionSegment[], raw: string): void {
  const content = normalizeSegmentMarkdown(raw);
  if (content) {
    segments.push({ type: 'markdown', content });
  }
}

function findBlockOpen(
  source: string,
  from: number
): { attrs: string; contentStart: number; start: number } | null {
  const openMarker = '{%';
  let searchFrom = from;
  while (searchFrom < source.length) {
    const start = source.indexOf(openMarker, searchFrom);
    if (start < 0) {
      return null;
    }
    const afterOpen = source.slice(start + openMarker.length);
    const blockMatch = /^\s*block\b([^%]*)%}/i.exec(afterOpen);
    if (!blockMatch) {
      searchFrom = start + openMarker.length;
      continue;
    }
    return {
      start,
      attrs: blockMatch[1] ?? '',
      contentStart: start + openMarker.length + blockMatch[0].length,
    };
  }
  return null;
}

function findBlockClose(
  source: string,
  from: number
): { contentEnd: number; end: number } | null {
  const closeMarker = '{%';
  let searchFrom = from;
  while (searchFrom < source.length) {
    const start = source.indexOf(closeMarker, searchFrom);
    if (start < 0) {
      return null;
    }
    const afterOpen = source.slice(start + closeMarker.length);
    const closeMatch = /^\s*endblock\s*%}/i.exec(afterOpen);
    if (!closeMatch) {
      searchFrom = start + closeMarker.length;
      continue;
    }
    return {
      contentEnd: start,
      end: start + closeMarker.length + closeMatch[0].length,
    };
  }
  return null;
}

function appendBlockSegment(
  segments: TrackerDescriptionSegment[],
  source: string,
  open: { attrs: string; contentStart: number; start: number }
): number | null {
  const close = findBlockClose(source, open.contentStart);
  if (!close) {
    pushMarkdownIfPresent(segments, source.slice(open.start));
    return null;
  }

  const blockContent = normalizeSegmentMarkdown(
    source.slice(open.contentStart, close.contentEnd)
  );
  if (blockContent) {
    segments.push({
      type: 'block',
      borderColor: parseBlockBorderColor(open.attrs),
      content: blockContent,
    });
  }
  return close.end;
}

/**
 * Разбивает описание Tracker (YFM + {% block %}) на сегменты для безопасного рендера.
 */
export function parseTrackerDescription(raw: string | null | undefined): TrackerDescriptionSegment[] {
  if (!raw?.trim()) {
    return [];
  }

  const source = decodeTrackerHtmlEntities(raw);
  const segments: TrackerDescriptionSegment[] = [];
  let lastIndex = 0;

  while (lastIndex < source.length) {
    const open = findBlockOpen(source, lastIndex);
    if (!open) {
      break;
    }

    if (open.start > lastIndex) {
      pushMarkdownIfPresent(segments, source.slice(lastIndex, open.start));
    }

    const nextIndex = appendBlockSegment(segments, source, open);
    if (nextIndex == null) {
      return segments;
    }
    lastIndex = nextIndex;
  }

  if (lastIndex < source.length) {
    pushMarkdownIfPresent(segments, source.slice(lastIndex));
  }

  return segments;
}

function formatTrackerBlockMarkdown(borderColor: string, content: string): string {
  return `{% block padding=s border=solid borderColor=${borderColor} %}\n${content}\n{% endblock %}`;
}

/**
 * Нормализует описание Tracker в markdown, понятный WYSIWYG-редактору (в т.ч. {% block %}).
 */
export function trackerDescriptionToEditorMarkdown(raw: string | null | undefined): string {
  const segments = parseTrackerDescription(raw);
  if (segments.length === 0) {
    return '';
  }

  return segments
    .map((segment) => {
      if (segment.type === 'block') {
        return formatTrackerBlockMarkdown(segment.borderColor, segment.content);
      }
      return segment.content;
    })
    .join('\n\n');
}

/** Сравнение markdown из редактора без хвостовых пустых строк. */
export function normalizeEditorMarkdown(value: string): string {
  return value.trim();
}
