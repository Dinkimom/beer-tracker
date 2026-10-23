/**
 * Текст заметки ↔ JSON-документ WYSIWYG-редактора (схема Tiptap/ProseMirror).
 *
 * Заметка хранится как строковый markdown-сабсет: её читает агент через MCP, правят
 * чекбоксы на доске, видят другие участники. Поэтому преобразование построчное и без потерь:
 * каждая строка — блок (абзац, заголовок, пункт списка, чекбокс), блок помнит исходную
 * строку в `attrs.source`. Нетронутая строка сохраняется байт в байт, отредактированная
 * собирается заново в каноническом виде (`- `, `- [x] `, `# `).
 */

import {
  parseMarkdownBulletLine,
  parseMarkdownCheckboxLine,
} from '@/lib/markdown/markdownChecklist';

import { parseStickyNoteInlineFormat, type StickyNoteInlineNode } from './stickyNoteInlineFormat';
import { splitStickyNoteTextByMentions } from './stickyNoteMentions';

type StickyNoteRichMarkType = 'bold' | 'code' | 'italic' | 'strike';

/** Подмножество Tiptap `JSONContent`, которое производит и принимает редактор заметки. */
export interface StickyNoteRichNode {
  attrs?: Record<string, unknown>;
  content?: StickyNoteRichNode[];
  marks?: Array<{ type: string }>;
  text?: string;
  type?: string;
}

export const STICKY_NOTE_MENTION_NODE = 'noteMention';

const MARK_DELIMITERS: Record<StickyNoteRichMarkType, string> = {
  bold: '**',
  code: '`',
  italic: '*',
  strike: '~~',
};

/** При равной длине пролёта снаружи оказывается метка, стоящая раньше. */
const MARK_ORDER: readonly StickyNoteRichMarkType[] = ['bold', 'strike', 'italic', 'code'];

function isRichMarkType(type: string): type is StickyNoteRichMarkType {
  return type in MARK_DELIMITERS;
}

function withMarks(node: StickyNoteRichNode, marks: readonly StickyNoteRichMarkType[]): StickyNoteRichNode {
  return marks.length > 0 ? { ...node, marks: marks.map((type) => ({ type })) } : node;
}

function plainTextToInline(value: string, marks: readonly StickyNoteRichMarkType[]): StickyNoteRichNode[] {
  return splitStickyNoteTextByMentions(value).flatMap((segment): StickyNoteRichNode[] => {
    if (segment.type === 'mention') {
      return [
        withMarks(
          { attrs: { id: segment.id, name: segment.name }, type: STICKY_NOTE_MENTION_NODE },
          marks
        ),
      ];
    }
    return segment.value ? [withMarks({ text: segment.value, type: 'text' }, marks)] : [];
  });
}

function inlineTreeToNodes(
  nodes: readonly StickyNoteInlineNode[],
  marks: readonly StickyNoteRichMarkType[]
): StickyNoteRichNode[] {
  return nodes.flatMap((node): StickyNoteRichNode[] => {
    if (node.type === 'text') {
      return plainTextToInline(node.value, marks);
    }
    if (node.type === 'code') {
      return node.value ? [withMarks({ text: node.value, type: 'text' }, [...marks, 'code'])] : [];
    }
    return inlineTreeToNodes(node.children, [...marks, node.type]);
  });
}

function parseInline(text: string): StickyNoteRichNode[] {
  return inlineTreeToNodes(parseStickyNoteInlineFormat(text), []);
}

function paragraph(text: string, attrs?: Record<string, unknown>): StickyNoteRichNode {
  const content = parseInline(text);
  return {
    type: 'paragraph',
    ...(attrs ? { attrs } : {}),
    ...(content.length > 0 ? { content } : {}),
  };
}

function parseHeadingLine(line: string): { level: number; text: string } | null {
  const match = /^(#{1,3}) /.exec(line);
  return match ? { level: match[1].length, text: line.slice(match[0].length) } : null;
}

interface ParsedLine {
  list: 'bulletList' | 'taskList' | null;
  node: StickyNoteRichNode;
}

/** Порядок как у просмотра заметки: чекбокс → заголовок → пункт списка → текст. */
function parseLine(line: string): ParsedLine {
  const checkbox = parseMarkdownCheckboxLine(line);
  if (checkbox) {
    return {
      list: 'taskList',
      node: { attrs: { checked: checkbox.checked, source: line }, content: [paragraph(checkbox.text)], type: 'taskItem' },
    };
  }
  const heading = parseHeadingLine(line);
  if (heading) {
    const content = parseInline(heading.text);
    return {
      list: null,
      node: {
        attrs: { level: heading.level, source: line },
        type: 'heading',
        ...(content.length > 0 ? { content } : {}),
      },
    };
  }
  const bullet = parseMarkdownBulletLine(line);
  if (bullet != null) {
    return {
      list: 'bulletList',
      node: { attrs: { source: line }, content: [paragraph(bullet)], type: 'listItem' },
    };
  }
  return { list: null, node: paragraph(line, { source: line }) };
}

export function parseStickyNoteRichDoc(text: string): StickyNoteRichNode {
  const blocks: StickyNoteRichNode[] = [];
  for (const line of text.split('\n')) {
    const { list, node } = parseLine(line);
    const last = blocks.at(-1);
    if (list && last?.type === list) {
      last.content?.push(node);
    } else if (list) {
      blocks.push({ content: [node], type: list });
    } else {
      blocks.push(node);
    }
  }
  return { content: blocks, type: 'doc' };
}

interface InlineSegment {
  marks: ReadonlySet<StickyNoteRichMarkType>;
  text: string;
}

function inlineSegment(node: StickyNoteRichNode): InlineSegment {
  const marks = new Set(
    (node.marks ?? []).map((mark) => mark.type).filter(isRichMarkType)
  );
  if (node.type === STICKY_NOTE_MENTION_NODE) {
    return { marks, text: `@[${String(node.attrs?.name ?? '')}](${String(node.attrs?.id ?? '')})` };
  }
  return { marks, text: node.text ?? '' };
}

function runLength(segments: readonly InlineSegment[], from: number, mark: StickyNoteRichMarkType): number {
  let end = from;
  while (end < segments.length && segments[end].marks.has(mark)) {
    end += 1;
  }
  return end - from;
}

/** Метка, открывающаяся на `index` и тянущаяся дальше всех: она становится внешней. */
function pickOpeningMark(
  segments: readonly InlineSegment[],
  index: number,
  outer: ReadonlySet<StickyNoteRichMarkType>
): StickyNoteRichMarkType | null {
  let best: StickyNoteRichMarkType | null = null;
  let bestLength = 0;
  for (const mark of MARK_ORDER) {
    if (outer.has(mark) || !segments[index].marks.has(mark)) {
      continue;
    }
    const length = runLength(segments, index, mark);
    if (length > bestLength) {
      best = mark;
      bestLength = length;
    }
  }
  return best;
}

/** Пробелы по краям выносим за маркеры: `** жирный **` парсер бы не узнал. */
function wrapWithDelimiter(inner: string, delimiter: string): string {
  const core = inner.trim();
  if (!core) {
    return inner;
  }
  const lead = inner.slice(0, inner.length - inner.trimStart().length);
  const trail = inner.slice(inner.trimEnd().length);
  return `${lead}${delimiter}${core}${delimiter}${trail}`;
}

function serializeSegments(
  segments: readonly InlineSegment[],
  outer: ReadonlySet<StickyNoteRichMarkType>
): string {
  let out = '';
  let index = 0;
  while (index < segments.length) {
    const mark = pickOpeningMark(segments, index, outer);
    if (!mark) {
      out += segments[index].text;
      index += 1;
      continue;
    }
    const end = index + runLength(segments, index, mark);
    const inner = serializeSegments(segments.slice(index, end), new Set([...outer, mark]));
    out += wrapWithDelimiter(inner, MARK_DELIMITERS[mark]);
    index = end;
  }
  return out;
}

function serializeInline(node: StickyNoteRichNode | undefined): string {
  return serializeSegments((node?.content ?? []).map(inlineSegment), new Set());
}

function serializeParagraphs(node: StickyNoteRichNode): string[] {
  const paragraphs = node.content ?? [];
  return paragraphs.length > 0 ? paragraphs.map((child) => serializeInline(child)) : [''];
}

function canonicalLines(node: StickyNoteRichNode): string[] {
  if (node.type === 'taskItem') {
    const [first = '', ...rest] = serializeParagraphs(node);
    return [`- [${node.attrs?.checked === true ? 'x' : ' '}] ${first}`, ...rest];
  }
  if (node.type === 'listItem') {
    const [first = '', ...rest] = serializeParagraphs(node);
    return [`- ${first}`, ...rest];
  }
  if (node.type === 'heading') {
    const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)));
    return [`${'#'.repeat(level)} ${serializeInline(node)}`];
  }
  return [serializeInline(node)];
}

function serializeBlock(node: StickyNoteRichNode): string[] {
  const lines = canonicalLines(node);
  const source = node.attrs?.source;
  if (typeof source !== 'string') {
    return lines;
  }
  // Строку не трогали, если она разбирается в тот же блок: тогда возвращаем её как была.
  const unchanged = canonicalLines(parseLine(source).node).join('\n') === lines.join('\n');
  return unchanged ? [source] : lines;
}

export function serializeStickyNoteRichDoc(doc: StickyNoteRichNode): string {
  const lines: string[] = [];
  for (const block of doc.content ?? []) {
    if (block.type === 'bulletList' || block.type === 'taskList') {
      for (const item of block.content ?? []) {
        lines.push(...serializeBlock(item));
      }
    } else {
      lines.push(...serializeBlock(block));
    }
  }
  return lines.join('\n');
}
