import { Markdown } from '@tiptap/markdown';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';

import { TrackerDescriptionBlockExtension } from './TrackerDescriptionBlockExtension';
import { normalizeEditorMarkdown } from './trackerDescriptionParse';

describe('TrackerDescriptionBlockExtension', () => {
  it('round-trips Tracker block markdown through TipTap', () => {
    const input = [
      '## Цель:',
      '',
      '{% block padding=s border=solid borderColor=info %}',
      '## Для тестирования:',
      '{% endblock %}',
    ].join('\n');

    const editor = new Editor({
      extensions: [
        StarterKit,
        Markdown.configure({ markedOptions: { gfm: true } }),
        TrackerDescriptionBlockExtension,
      ],
      content: input,
      contentType: 'markdown',
    });

    try {
      const json = editor.getJSON();
      expect(json.content?.some((node) => node.type === 'trackerBlock')).toBe(true);
      expect(normalizeEditorMarkdown(editor.getMarkdown())).toBe(normalizeEditorMarkdown(input));
    } finally {
      editor.destroy();
    }
  });
});
