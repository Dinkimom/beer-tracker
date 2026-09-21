import { Node, mergeAttributes } from '@tiptap/react';

import { trackerDescriptionBlockBorderClass } from '@/features/task/components/TaskInfoSidebar/trackerDescriptionBlockBorderClass';

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
