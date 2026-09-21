'use client';

import { StickyNoteTextContent } from '@/features/comments/components/StickyNoteTextContent';
import {
  parseMarkdownCheckboxLine,
  toggleMarkdownCheckboxAtLine,
} from '@/lib/markdown/markdownChecklist';

const MARKDOWN_HEADING_CLASS_CARD: Record<number, string> = {
  1: 'mb-1 mt-1 text-xs font-semibold',
  2: 'mb-0.5 mt-1.5 text-xs font-semibold',
  3: 'mb-0.5 mt-1 text-xs font-medium',
};

const CARD_LINE_ITEM_CLASS = 'py-0.5';
const PANEL_LINE_ITEM_CLASS = 'py-px';

function resolveLineItemPaddingClass(variant: 'card' | 'panel'): string {
  return variant === 'card' ? CARD_LINE_ITEM_CLASS : PANEL_LINE_ITEM_CLASS;
}

interface MarkdownChecklistPreviewProps {
  className?: string;
  isDragging?: boolean;
  markdown: string;
  variant?: 'card' | 'panel';
  onMarkdownChange?: (next: string) => void;
}

function parseMarkdownHeadingLine(line: string): { level: number; text: string } | null {
  if (!line.startsWith('#')) {
    return null;
  }

  let level = 0;
  while (level < line.length && line[level] === '#') {
    level += 1;
  }

  if (level < 1 || level > 3 || line[level] !== ' ') {
    return null;
  }

  return { level, text: line.slice(level + 1) };
}

function parseMarkdownBulletLine(line: string): string | null {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('- ')) {
    return trimmed.slice(2);
  }
  if (trimmed.startsWith('* ')) {
    return trimmed.slice(2);
  }
  if (trimmed.startsWith('+ ')) {
    return trimmed.slice(2);
  }
  return null;
}

function stopCardPointerBubble(event: React.SyntheticEvent) {
  event.stopPropagation();
}

function renderStickyNoteInlineText(text: string, isDragging: boolean) {
  if (!text) {
    return '\u00a0';
  }
  return <StickyNoteTextContent isDragging={isDragging} text={text} />;
}

function renderMarkdownCheckboxLine(
  line: string,
  lineIndex: number,
  markdown: string,
  isDragging: boolean,
  onMarkdownChange: ((next: string) => void) | undefined,
  variant: 'card' | 'panel'
) {
  const checkbox = parseMarkdownCheckboxLine(line);
  if (!checkbox) {
    return null;
  }

  const editable = onMarkdownChange != null;
  const checkboxSizeClass = 'h-3.5 w-3.5';
  const checkboxAlignClass = variant === 'card' ? 'mt-0.5' : 'mt-px';

  return (
    <label
      key={lineIndex}
      className={`flex items-start gap-1.5 ${resolveLineItemPaddingClass(variant)} ${editable ? 'cursor-pointer' : ''}`}
      onMouseDown={editable ? stopCardPointerBubble : undefined}
      onPointerDown={editable ? stopCardPointerBubble : undefined}
    >
      <input
        checked={checkbox.checked}
        className={`${checkboxAlignClass} shrink-0 accent-blue-600 dark:accent-blue-500 ${checkboxSizeClass} ${
          editable ? 'cursor-pointer' : 'cursor-default'
        }`}
        disabled={!editable}
        readOnly={!editable}
        type="checkbox"
        onChange={
          editable
            ? () => {
                onMarkdownChange(toggleMarkdownCheckboxAtLine(markdown, lineIndex));
              }
            : undefined
        }
      />
      <span className={checkbox.checked ? 'text-gray-500 line-through dark:text-gray-400' : ''}>
        {renderStickyNoteInlineText(checkbox.text, isDragging)}
      </span>
    </label>
  );
}

function renderMarkdownHeadingLine(line: string, lineIndex: number, isDragging: boolean) {
  const heading = parseMarkdownHeadingLine(line);
  if (!heading) {
    return null;
  }

  const Tag = (`h${heading.level}` as 'h1' | 'h2' | 'h3');

  return (
    <Tag key={lineIndex} className={MARKDOWN_HEADING_CLASS_CARD[heading.level] ?? MARKDOWN_HEADING_CLASS_CARD[3]}>
      {renderStickyNoteInlineText(heading.text, isDragging)}
    </Tag>
  );
}

function renderMarkdownBulletLine(
  line: string,
  lineIndex: number,
  isDragging: boolean,
  variant: 'card' | 'panel'
) {
  const bulletText = parseMarkdownBulletLine(line);
  if (bulletText == null) {
    return null;
  }

  return (
    <div key={lineIndex} className={`flex gap-1.5 pl-0.5 ${resolveLineItemPaddingClass(variant)}`}>
      <span aria-hidden className="select-none text-gray-400">
        •
      </span>
      <span>{renderStickyNoteInlineText(bulletText, isDragging)}</span>
    </div>
  );
}

function renderPlainMarkdownLine(
  line: string,
  lineIndex: number,
  isDragging: boolean,
  variant: 'card' | 'panel'
) {
  if (!line.trim()) {
    return <div key={lineIndex} aria-hidden className={variant === 'card' ? 'h-1.5' : 'h-2'} />;
  }

  const paddingClass = variant === 'card' ? CARD_LINE_ITEM_CLASS : PANEL_LINE_ITEM_CLASS;
  return (
    <p key={lineIndex} className={paddingClass}>
      <StickyNoteTextContent isDragging={isDragging} text={line} />
    </p>
  );
}

function renderMarkdownLine(
  line: string,
  lineIndex: number,
  markdown: string,
  isDragging: boolean,
  onMarkdownChange: ((next: string) => void) | undefined,
  variant: 'card' | 'panel'
) {
  return (
    renderMarkdownCheckboxLine(line, lineIndex, markdown, isDragging, onMarkdownChange, variant)
    ?? renderMarkdownHeadingLine(line, lineIndex, isDragging)
    ?? renderMarkdownBulletLine(line, lineIndex, isDragging, variant)
    ?? renderPlainMarkdownLine(line, lineIndex, isDragging, variant)
  );
}

export function MarkdownChecklistPreview({
  className = '',
  isDragging = false,
  markdown,
  onMarkdownChange,
  variant = 'panel',
}: MarkdownChecklistPreviewProps) {
  const rootClass =
    variant === 'card'
      ? 'font-excalifont text-xs leading-normal'
      : 'text-sm leading-relaxed text-gray-900 dark:text-gray-100';

  if (!markdown.trim()) {
    return null;
  }

  const lines = markdown.split('\n');

  return (
    <div
      className={`${rootClass} min-h-0 overflow-y-auto ${className}`}
      onMouseDown={variant === 'card' ? stopCardPointerBubble : undefined}
      onPointerDown={variant === 'card' ? stopCardPointerBubble : undefined}
    >
      {lines.map((line, lineIndex) =>
        renderMarkdownLine(line, lineIndex, markdown, isDragging, onMarkdownChange, variant)
      )}
    </div>
  );
}
