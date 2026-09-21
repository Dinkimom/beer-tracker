import { describe, expect, it } from 'vitest';

import {
  decodeTrackerHtmlEntities,
  normalizeEditorMarkdown,
  parseTrackerDescription,
  trackerDescriptionToEditorMarkdown,
} from './trackerDescriptionParse';

describe('trackerDescriptionParse', () => {
  it('decodeTrackerHtmlEntities replaces common entities', () => {
    expect(decodeTrackerHtmlEntities('A&nbsp;&amp;&nbsp;B')).toBe('A & B');
  });

  it('parses headings and info blocks from Tracker markup', () => {
    const raw = [
      '## Цель:',
      '&nbsp;',
      '## Сейчас:',
      '&nbsp;',
      '## Необходимо:',
      '&nbsp;',
      '## Результат:',
      '&nbsp;',
      '{% block padding=s border=solid borderColor=info %}',
      '## Для тестирования:',
      '&nbsp;',
      '{% endblock %}',
    ].join('\n');

    const segments = parseTrackerDescription(raw);

    expect(segments).toEqual([
      {
        type: 'markdown',
        content: '## Цель:\n\n## Сейчас:\n\n## Необходимо:\n\n## Результат:',
      },
      {
        type: 'block',
        borderColor: 'info',
        content: '## Для тестирования:',
      },
    ]);
  });

  it('returns empty array for blank input', () => {
    expect(parseTrackerDescription('')).toEqual([]);
    expect(parseTrackerDescription('   &nbsp;  ')).toEqual([]);
  });

  it('trackerDescriptionToEditorMarkdown rebuilds editable markdown with blocks', () => {
    const raw = [
      '## Цель:',
      '&nbsp;',
      '{% block padding=s border=solid borderColor=warning %}',
      '## Для тестирования:',
      '&nbsp;',
      '{% endblock %}',
    ].join('\n');

    expect(trackerDescriptionToEditorMarkdown(raw)).toBe(
      [
        '## Цель:',
        '',
        '{% block padding=s border=solid borderColor=warning %}',
        '## Для тестирования:',
        '{% endblock %}',
      ].join('\n')
    );
  });

  it('normalizeEditorMarkdown trims trailing whitespace', () => {
    expect(normalizeEditorMarkdown('## Hello\n\n')).toBe('## Hello');
  });
});
