import { describe, expect, it } from 'vitest';

import { jiraAdfToMarkdown } from './jiraAdfToMarkdown';

describe('jiraAdfToMarkdown', () => {
  it('returns empty string for non-objects', () => {
    expect(jiraAdfToMarkdown(null)).toBe('');
    expect(jiraAdfToMarkdown('plain')).toBe('');
  });

  it('converts paragraphs, marks, and hard breaks', () => {
    expect(
      jiraAdfToMarkdown({
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello', marks: [{ type: 'strong' }] },
              { type: 'text', text: ' ' },
              { type: 'text', text: 'world', marks: [{ type: 'em' }] },
              { type: 'hardBreak' },
              {
                type: 'text',
                text: 'link',
                marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
              },
            ],
          },
        ],
      })
    ).toBe('**Hello** *world*\n[link](https://example.com)');
  });

  it('converts headings, lists, code, quotes, and tables', () => {
    expect(
      jiraAdfToMarkdown({
        type: 'doc',
        version: 1,
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Title' }] },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
              },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'ts' },
            content: [{ type: 'text', text: 'const x = 1;' }],
          },
          {
            type: 'blockquote',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Note' }] }],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                  },
                  {
                    type: 'tableHeader',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }],
                  },
                  {
                    type: 'tableCell',
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }],
                  },
                ],
              },
            ],
          },
        ],
      })
    ).toBe(
      [
        '## Title',
        '',
        '- One',
        '- Two',
        '',
        '```ts',
        'const x = 1;',
        '```',
        '',
        '> Note',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
      ].join('\n')
    );
  });

  it('renders mentions and skips empty media nodes', () => {
    expect(
      jiraAdfToMarkdown({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'mention', attrs: { text: '@Ada', id: 'acc-1' } },
              { type: 'text', text: ' please review' },
            ],
          },
          { type: 'mediaSingle', content: [{ type: 'media', attrs: { id: '1' } }] },
        ],
      })
    ).toBe('@Ada please review');
  });
});
