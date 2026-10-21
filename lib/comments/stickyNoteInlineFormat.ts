import { splitStickyNoteTextByUrls } from './stickyNoteLinks';
import { findStickyNoteMentionTokenRanges } from './stickyNoteMentions';

/** Для описаний MCP: инлайн-разметка, которую рендерят и заметки планера, и карточки ретро. */
export const STICKY_NOTE_INLINE_FORMAT_DESCRIPTION =
  'Inline markdown is rendered: **bold**, *italic*, ~~strike~~, `code`. URLs and tracker issue keys become link badges automatically.';

/** Для описаний MCP: полный markdown-сабсет заметки на свимлейне. */
export const PLANNER_NOTE_TEXT_FORMAT_DESCRIPTION = `Markdown subset rendered on the sticky note: line-level # / ## / ### headings (# is larger than body text — avoid in one-row notes), - [ ] / - [x] checklists (users tick them on the board; to mark an item done, updateNote with [x]), - bullets. ${STICKY_NOTE_INLINE_FORMAT_DESCRIPTION} No tables, images, [text](url) links or HTML — paste bare URLs.`;

type StickyNoteEmphasisType = 'bold' | 'italic' | 'strike';

export type StickyNoteInlineNode =
  | { children: StickyNoteInlineNode[]; type: StickyNoteEmphasisType }
  | { type: 'code'; value: string }
  | { type: 'text'; value: string };

type TextRange = readonly [number, number];

interface InlineSpanMatch {
  end: number;
  node: StickyNoteInlineNode;
}

/** Порядок важен: `**` проверяется раньше `*`. */
const EMPHASIS_DELIMITERS: ReadonlyArray<{ marker: string; type: StickyNoteEmphasisType }> = [
  { marker: '**', type: 'bold' },
  { marker: '~~', type: 'strike' },
  { marker: '*', type: 'italic' },
];

/** Ссылки и @-упоминания: маркеры внутри них не считаются форматированием. */
function findProtectedRanges(text: string): TextRange[] {
  const ranges: TextRange[] = findStickyNoteMentionTokenRanges(text);
  let offset = 0;
  for (const segment of splitStickyNoteTextByUrls(text)) {
    const length = segment.type === 'url' ? segment.raw.length : segment.value.length;
    if (segment.type === 'url') {
      ranges.push([offset, offset + length]);
    }
    offset += length;
  }
  return ranges;
}

function protectedRangeEndAt(ranges: readonly TextRange[], index: number): number | null {
  const range = ranges.find(([start, end]) => index >= start && index < end);
  return range ? range[1] : null;
}

function isWhitespaceOrEdge(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

function findClosingMarker(
  text: string,
  marker: string,
  from: number,
  ranges: readonly TextRange[]
): number {
  let index = from;
  while (index < text.length) {
    const protectedEnd = protectedRangeEndAt(ranges, index);
    if (protectedEnd != null) {
      index = protectedEnd;
      continue;
    }
    // Внутри `*курсива*` маркеры вложенного `**жирного**` не закрывают курсив.
    if (marker === '*' && text.startsWith('**', index)) {
      index += 2;
      continue;
    }
    if (text.startsWith(marker, index) && !isWhitespaceOrEdge(text[index - 1])) {
      return index;
    }
    index += 1;
  }
  return -1;
}

function matchCodeSpanAt(text: string, index: number): InlineSpanMatch | null {
  const close = text.indexOf('`', index + 1);
  if (close <= index + 1) {
    return null;
  }
  return { end: close + 1, node: { type: 'code', value: text.slice(index + 1, close) } };
}

function canOpenEmphasis(text: string, index: number, marker: string): boolean {
  if (!text.startsWith(marker, index) || isWhitespaceOrEdge(text[index + marker.length])) {
    return false;
  }
  // Незакрытый `**` не должен превращаться в `*` + курсив со звёздочкой внутри.
  return marker !== '*' || text[index + 1] !== '*';
}

function matchInlineSpanAt(
  text: string,
  index: number,
  ranges: readonly TextRange[]
): InlineSpanMatch | null {
  if (text[index] === '`') {
    return matchCodeSpanAt(text, index);
  }
  for (const { marker, type } of EMPHASIS_DELIMITERS) {
    if (!canOpenEmphasis(text, index, marker)) {
      continue;
    }
    const contentStart = index + marker.length;
    const close = findClosingMarker(text, marker, contentStart + 1, ranges);
    if (close >= 0) {
      const children = parseStickyNoteInlineFormat(text.slice(contentStart, close));
      return { end: close + marker.length, node: { children, type } };
    }
  }
  return null;
}

function pushPlainText(nodes: StickyNoteInlineNode[], value: string): void {
  if (value) {
    nodes.push({ type: 'text', value });
  }
}

/**
 * Инлайн-markdown заметки: `**жирный**`, `*курсив*`, `~~зачёркнутый~~`, `` `код` ``.
 * Ссылки и упоминания остаются в текстовых узлах — их разбирает `StickyNoteTextContent`.
 */
export function parseStickyNoteInlineFormat(text: string): StickyNoteInlineNode[] {
  const ranges = findProtectedRanges(text);
  const nodes: StickyNoteInlineNode[] = [];
  let plainStart = 0;
  let index = 0;
  while (index < text.length) {
    const protectedEnd = protectedRangeEndAt(ranges, index);
    if (protectedEnd != null) {
      index = protectedEnd;
      continue;
    }
    const match = matchInlineSpanAt(text, index, ranges);
    if (!match) {
      index += 1;
      continue;
    }
    pushPlainText(nodes, text.slice(plainStart, index));
    nodes.push(match.node);
    index = match.end;
    plainStart = index;
  }
  pushPlainText(nodes, text.slice(plainStart));
  return nodes;
}
