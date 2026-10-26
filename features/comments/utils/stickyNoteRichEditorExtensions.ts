import type { AnyExtension } from '@tiptap/react';

import { ListItem, TaskItem, TaskList } from '@tiptap/extension-list';
import { Extension, InputRule, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { STICKY_NOTE_MENTION_NODE } from '@/lib/comments/stickyNoteRichDoc';

/**
 * Исходная строка заметки на блоке (см. `stickyNoteRichDoc`). В DOM не рендерится и не
 * копируется в новый блок при Enter — иначе сериализатор вернул бы старую строку.
 */
const StickyNoteLineSource = Extension.create({
  name: 'stickyNoteLineSource',
  addGlobalAttributes() {
    return [
      {
        attributes: {
          source: { default: null, keepOnSplit: false, rendered: false },
        },
        types: ['heading', 'listItem', 'paragraph', 'taskItem'],
      },
    ];
  },
});

/** `@[Имя](id)` — неделимый узел, выглядит как бейдж упоминания на доске. */
const StickyNoteMention = Node.create({
  name: STICKY_NOTE_MENTION_NODE,
  atom: true,
  group: 'inline',
  inline: true,
  selectable: false,
  addAttributes() {
    return {
      id: { default: '' },
      name: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-note-mention]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-note-mention': '' }),
      `@${String(node.attrs.name)}`,
    ];
  },
  renderText({ node }) {
    return `@${String(node.attrs.name)}`;
  },
});

/**
 * `[ ] ` / `[x] ` в начале пункта маркированного списка превращает его в чекбокс,
 * как `- [ ] ` в тексте заметки. Стандартное правило TaskItem внутри пункта не срабатывает:
 * вложенные списки схема заметки не допускает.
 */
const StickyNoteBulletToTask = Extension.create({
  name: 'stickyNoteBulletToTask',
  priority: 1000,
  addInputRules() {
    return [
      new InputRule({
        find: /^\[([ xX]?)\]\s$/,
        handler: ({ chain, match, range, state }) => {
          const $from = state.doc.resolve(range.from);
          if ($from.depth < 1 || $from.node(-1).type.name !== 'listItem') {
            return null;
          }
          chain()
            .deleteRange(range)
            .liftListItem('listItem')
            .toggleTaskList()
            .updateAttributes('taskItem', { checked: (match[1] ?? '').toLowerCase() === 'x' })
            .run();
        },
      }),
    ];
  },
});

/**
 * Backspace в начале заголовка снимает стиль заголовка (`#` в WYSIWYG не видно, удалить нечем).
 * Стандартный Backspace превращает в абзац только пустой заголовок, а непустой склеивает с предыдущей строкой.
 */
const StickyNoteHeadingBackspace = Extension.create({
  name: 'stickyNoteHeadingBackspace',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parentOffset !== 0 || $from.parent.type.name !== 'heading') {
          return false;
        }
        return editor.commands.setParagraph();
      },
    };
  },
});

/** Только то, что умеет показывать заметка: строки, заголовки 1–3, списки, чекбоксы, инлайн-разметка. */
export function createStickyNoteRichEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      blockquote: false,
      codeBlock: false,
      dropcursor: false,
      hardBreak: false,
      heading: { levels: [1, 2, 3] },
      horizontalRule: false,
      link: false,
      listItem: false,
      orderedList: false,
      trailingNode: false,
      underline: false,
    }),
    ListItem.extend({ content: 'paragraph' }),
    TaskList,
    TaskItem.configure({ nested: false }).extend({ content: 'paragraph' }),
    StickyNoteLineSource,
    StickyNoteMention,
    StickyNoteBulletToTask,
    StickyNoteHeadingBackspace,
  ];
}
