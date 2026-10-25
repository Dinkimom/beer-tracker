import { Node, mergeAttributes } from '@tiptap/react';

/** Классы рамки `{% block borderColor=… %}` — те же, что в прежнем markdown-рендере. */
function trackerDescriptionBlockBorderClass(color: string): string {
  switch (color) {
    case 'warning':
    case 'orange':
    case 'yellow':
      return 'border-amber-300 bg-amber-50/70 dark:border-amber-600/60 dark:bg-amber-950/30';
    case 'danger':
    case 'red':
      return 'border-red-300 bg-red-50/70 dark:border-red-600/60 dark:bg-red-950/30';
    case 'success':
    case 'green':
      return 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-600/60 dark:bg-emerald-950/30';
    case 'normal':
    case 'gray':
      return 'border-gray-300 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-700/50';
    case 'info':
    case 'blue':
    default:
      return 'border-sky-300 bg-sky-50/70 dark:border-sky-500/50 dark:bg-sky-950/35';
  }
}

const BLOCK_OPEN_RE = /^\{%\s*block\b([^%]*)%\}\n?([\s\S]*?)\n?\{%\s*endblock\s*%\}/i;

function parseBorderColorFromAttrs(attrs: string): string {
  const match = /borderColor\s*=\s*([a-z0-9_-]+)/i.exec(attrs);
  return match?.[1]?.toLowerCase() || 'info';
}

/**
 * TipTap-узел для Tracker `{% block … %}…{% endblock %}` с round-trip в markdown.
 */
export const TrackerDescriptionBlockExtension = Node.create({
  name: 'trackerBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      borderColor: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-border-color') || 'info',
        renderHTML: (attributes) => ({
          'data-border-color': attributes.borderColor || 'info',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-tracker-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const borderColor = String(node.attrs.borderColor || 'info');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-tracker-block': '',
        class: `rounded-md border px-3 py-2 ${trackerDescriptionBlockBorderClass(borderColor)}`,
      }),
      0,
    ];
  },

  markdownTokenizer: {
    name: 'trackerBlock',
    level: 'block',
    start: (src) => src.indexOf('{%'),
    tokenize: (src, _tokens, lexer) => {
      const match = BLOCK_OPEN_RE.exec(src);
      if (!match) {
        return undefined;
      }

      const inner = (match[2] ?? '').trim();
      return {
        type: 'trackerBlock',
        raw: match[0],
        borderColor: parseBorderColorFromAttrs(match[1] ?? ''),
        tokens: lexer.blockTokens(inner),
      };
    },
  },

  parseMarkdown: (token, helpers) => ({
    type: 'trackerBlock',
    attrs: {
      borderColor: typeof token.borderColor === 'string' ? token.borderColor : 'info',
    },
    content: helpers.parseChildren(token.tokens || []),
  }),

  renderMarkdown: (node, helpers) => {
    const borderColor = String(node.attrs?.borderColor || 'info');
    const content = helpers.renderChildren(node.content || []).trim();
    return `{% block padding=s border=solid borderColor=${borderColor} %}\n${content}\n{% endblock %}\n\n`;
  },
});
