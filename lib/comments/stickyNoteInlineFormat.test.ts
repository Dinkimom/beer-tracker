import { describe, expect, it } from 'vitest';

import { parseStickyNoteInlineFormat } from './stickyNoteInlineFormat';

describe('parseStickyNoteInlineFormat', () => {
  it('keeps plain text as a single node', () => {
    expect(parseStickyNoteInlineFormat('just a note')).toEqual([
      { type: 'text', value: 'just a note' },
    ]);
  });

  it('parses bold, italic, strike and code spans', () => {
    expect(parseStickyNoteInlineFormat('**b** *i* ~~s~~ `c`')).toEqual([
      { children: [{ type: 'text', value: 'b' }], type: 'bold' },
      { type: 'text', value: ' ' },
      { children: [{ type: 'text', value: 'i' }], type: 'italic' },
      { type: 'text', value: ' ' },
      { children: [{ type: 'text', value: 's' }], type: 'strike' },
      { type: 'text', value: ' ' },
      { type: 'code', value: 'c' },
    ]);
  });

  it('nests bold inside italic', () => {
    expect(parseStickyNoteInlineFormat('*a **b** c*')).toEqual([
      {
        children: [
          { type: 'text', value: 'a ' },
          { children: [{ type: 'text', value: 'b' }], type: 'bold' },
          { type: 'text', value: ' c' },
        ],
        type: 'italic',
      },
    ]);
  });

  it('leaves unclosed or space-padded markers as text', () => {
    expect(parseStickyNoteInlineFormat('2 * 3 * 4')).toEqual([{ type: 'text', value: '2 * 3 * 4' }]);
    expect(parseStickyNoteInlineFormat('**draft')).toEqual([{ type: 'text', value: '**draft' }]);
    expect(parseStickyNoteInlineFormat('empty `` code')).toEqual([
      { type: 'text', value: 'empty `` code' },
    ]);
  });

  it('keeps a url wrapped in bold as a plain text child for link parsing', () => {
    expect(parseStickyNoteInlineFormat('see **https://example.com/a**')).toEqual([
      { type: 'text', value: 'see ' },
      { children: [{ type: 'text', value: 'https://example.com/a' }], type: 'bold' },
    ]);
  });

  it('ignores markers inside urls and mention tokens', () => {
    const url = 'https://example.com/a*b*c~~d~~e';
    expect(parseStickyNoteInlineFormat(`open ${url} now`)).toEqual([
      { type: 'text', value: `open ${url} now` },
    ]);
    const mention = '@[A*B*C](dev-1)';
    expect(parseStickyNoteInlineFormat(`ask ${mention}`)).toEqual([
      { type: 'text', value: `ask ${mention}` },
    ]);
  });

  it('does not treat snake_case as formatting', () => {
    expect(parseStickyNoteInlineFormat('rename some_var_name')).toEqual([
      { type: 'text', value: 'rename some_var_name' },
    ]);
  });
});
