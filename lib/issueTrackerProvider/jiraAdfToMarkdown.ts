/**
 * Converts Jira Cloud ADF (`fields.description` on REST API v3) to markdown
 * for the task sidebar editor. Plain-string wiki markup (API v2) is left as-is
 * by the caller.
 */

interface AdfMark {
  attrs?: Record<string, unknown>;
  type?: string;
}

interface AdfNode {
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  marks?: AdfMark[];
  text?: string;
  type?: string;
}

function isAdfNode(value: unknown): value is AdfNode {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function adfChildren(node: AdfNode): AdfNode[] {
  return Array.isArray(node.content) ? node.content.filter(isAdfNode) : [];
}

function attrString(attrs: Record<string, unknown> | undefined, key: string): string {
  const value = attrs?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function applyAdfMarks(text: string, marks: AdfMark[] | undefined): string {
  if (!marks?.length) {
    return text;
  }
  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `**${result}**`;
        break;
      case 'em':
        result = `*${result}*`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'link': {
        const href = attrString(mark.attrs, 'href');
        if (href) {
          result = `[${result}](${href})`;
        }
        break;
      }
      default:
        break;
    }
  }
  return result;
}

function renderAdfMention(node: AdfNode): string {
  const mention = attrString(node.attrs, 'text') || attrString(node.attrs, 'id');
  if (!mention) {
    return '';
  }
  return mention.startsWith('@') ? mention : `@${mention}`;
}

function renderAdfEmoji(node: AdfNode): string {
  return attrString(node.attrs, 'text') || attrString(node.attrs, 'shortName');
}

function renderAdfInlineNode(node: AdfNode): string {
  switch (node.type) {
    case 'text':
      return applyAdfMarks(node.text ?? '', node.marks);
    case 'hardBreak':
      return '\n';
    case 'mention':
      return renderAdfMention(node);
    case 'emoji':
      return renderAdfEmoji(node);
    case 'inlineCard':
      return attrString(node.attrs, 'url');
    default:
      return renderAdfInline(adfChildren(node));
  }
}

function renderAdfInline(nodes: AdfNode[]): string {
  return nodes.map(renderAdfInlineNode).join('');
}

function pushListItemLines(
  lines: string[],
  indent: string,
  marker: string,
  parts: string[]
): void {
  const [first, ...rest] = parts.filter((part) => part.trim().length > 0);
  if (!first) {
    return;
  }
  const firstLines = first.split('\n');
  lines.push(`${indent}${marker} ${firstLines[0] ?? ''}`);
  for (const continuation of firstLines.slice(1)) {
    lines.push(`${indent}  ${continuation}`);
  }
  for (const part of rest) {
    for (const line of part.split('\n')) {
      lines.push(`${indent}  ${line}`);
    }
  }
}

function renderAdfList(nodes: AdfNode[], ordered: boolean, depth: number): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];
  let index = 1;
  for (const item of nodes) {
    if (item.type !== 'listItem') {
      continue;
    }
    const marker = ordered ? `${index}.` : '-';
    index += 1;
    const parts = adfChildren(item).map((child) => renderAdfBlock(child, depth + 1));
    pushListItemLines(lines, indent, marker, parts);
  }
  return lines.join('\n');
}

function renderAdfTableCell(cell: AdfNode): string {
  return renderAdfInline(adfChildren(cell)).replaceAll('|', '\\|').replaceAll('\n', ' ').trim();
}

function renderAdfTable(node: AdfNode): string {
  const rows = adfChildren(node).filter((child) => child.type === 'tableRow');
  if (rows.length === 0) {
    return '';
  }
  const cells = rows.map((row) => adfChildren(row).map(renderAdfTableCell));
  const width = Math.max(...cells.map((row) => row.length), 1);
  const normalize = (row: string[]) => Array.from({ length: width }, (_, i) => row[i] ?? '');
  const header = normalize(cells[0] ?? []);
  const body = cells.slice(1).map(normalize);
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function joinChildBlocks(node: AdfNode, listDepth: number): string {
  return adfChildren(node)
    .map((child) => renderAdfBlock(child, listDepth))
    .filter(Boolean)
    .join('\n\n');
}

function renderAdfHeading(node: AdfNode): string {
  const levelRaw = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
  const level = Math.min(6, Math.max(1, levelRaw));
  return `${'#'.repeat(level)} ${renderAdfInline(adfChildren(node))}`;
}

function renderAdfCodeBlock(node: AdfNode): string {
  const language = attrString(node.attrs, 'language');
  return `\`\`\`${language}\n${renderAdfInline(adfChildren(node))}\n\`\`\``;
}

function renderAdfBlockquote(node: AdfNode, listDepth: number): string {
  return joinChildBlocks(node, listDepth)
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

function renderAdfBlock(node: AdfNode, listDepth = 0): string {
  switch (node.type) {
    case 'paragraph':
      return renderAdfInline(adfChildren(node));
    case 'heading':
      return renderAdfHeading(node);
    case 'bulletList':
      return renderAdfList(adfChildren(node), false, listDepth);
    case 'orderedList':
      return renderAdfList(adfChildren(node), true, listDepth);
    case 'codeBlock':
      return renderAdfCodeBlock(node);
    case 'blockquote':
      return renderAdfBlockquote(node, listDepth);
    case 'rule':
      return '---';
    case 'panel':
    case 'expand':
    case 'nestedExpand':
      return joinChildBlocks(node, listDepth);
    case 'table':
      return renderAdfTable(node);
    case 'mediaSingle':
    case 'mediaGroup':
    case 'media':
      return '';
    default:
      if (adfChildren(node).length > 0) {
        return joinChildBlocks(node, listDepth);
      }
      return renderAdfInline([node]);
  }
}

/** ADF doc (or subtree) → markdown. Empty / unknown input → ''. */
export function jiraAdfToMarkdown(raw: unknown): string {
  if (!isAdfNode(raw)) {
    return '';
  }
  const roots = raw.type === 'doc' ? adfChildren(raw) : [raw];
  return roots
    .map((node) => renderAdfBlock(node))
    .filter((block) => block.trim().length > 0)
    .join('\n\n')
    .trim();
}
