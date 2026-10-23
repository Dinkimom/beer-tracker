import { describe, expect, it } from 'vitest';

import {
  parseStickyNoteRichDoc,
  serializeStickyNoteRichDoc,
  type StickyNoteRichNode,
} from './stickyNoteRichDoc';

/** Документ «как после правки»: исходных строк нет, сериализатор собирает канонический вид. */
function stripSources(node: StickyNoteRichNode): StickyNoteRichNode {
  const { attrs, content, ...rest } = node;
  const nextAttrs = attrs ? Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'source')) : undefined;
  return {
    ...rest,
    ...(nextAttrs && Object.keys(nextAttrs).length > 0 ? { attrs: nextAttrs } : {}),
    ...(content ? { content: content.map(stripSources) } : {}),
  };
}

function canonical(text: string): string {
  return serializeStickyNoteRichDoc(stripSources(parseStickyNoteRichDoc(text)));
}

const text = (value: string, ...marks: string[]): StickyNoteRichNode => ({
  text: value,
  type: 'text',
  ...(marks.length > 0 ? { marks: marks.map((type) => ({ type })) } : {}),
});

describe('stickyNoteRichDoc', () => {
  it.each([
    '',
    'plain note',
    'line one\nline two',
    'a\n\n\nb\n',
    '# Title\n## Sub\n### Small\n#nospace\n#### four',
    '- one\n* two\n+ three\n  - indented',
    '- [ ] todo\n- [x] done\n* [X] upper\n1. [ ] numbered\n[] bare\n- [ ]',
    '**bold** *italic* ~~strike~~ `code`',
    '*a **b** c* and ***x***',
    '**unclosed and a * b * c',
    'ping @[Ivan Petrov](u-1) and @[Team](t2)',
    'https://example.com/x_*y* DEMO-12',
    '   leading spaces\ttab',
  ])('round-trips untouched text byte for byte: %j', (source) => {
    expect(serializeStickyNoteRichDoc(parseStickyNoteRichDoc(source))).toBe(source);
  });

  it('groups consecutive list lines into one list', () => {
    const doc = parseStickyNoteRichDoc('- a\n- b\n- [ ] c\nplain');
    expect(doc.content?.map((node) => node.type)).toEqual(['bulletList', 'taskList', 'paragraph']);
    expect(doc.content?.[0].content).toHaveLength(2);
  });

  it('turns mention tokens into mention nodes', () => {
    const doc = parseStickyNoteRichDoc('hi @[Ivan](u1)!');
    expect(doc.content?.[0].content).toEqual([
      text('hi '),
      { attrs: { id: 'u1', name: 'Ivan' }, type: 'noteMention' },
      text('!'),
    ]);
  });

  it('maps inline formatting to marks', () => {
    const doc = parseStickyNoteRichDoc('*a **b** c*');
    expect(doc.content?.[0].content).toEqual([
      text('a ', 'italic'),
      text('b', 'italic', 'bold'),
      text(' c', 'italic'),
    ]);
  });

  it.each([
    ['* two', '- two'],
    ['* [X] upper', '- [x] upper'],
    ['1. [ ] numbered', '- [ ] numbered'],
    ['  - indented', '- indented'],
    ['*a **b** c*', '*a **b** c*'],
    ['**b** *i* ~~s~~ `c`', '**b** *i* ~~s~~ `c`'],
    ['hi @[Ivan](u1)', 'hi @[Ivan](u1)'],
  ])('rebuilds an edited line canonically: %j → %j', (source, expected) => {
    expect(canonical(source)).toBe(expected);
  });

  it('keeps canonical output stable under re-parsing', () => {
    const source = '# Plan\n- one\n- [x] **done** item\nnote with *style* and @[Ivan](u1)';
    expect(canonical(canonical(source))).toBe(canonical(source));
  });

  it('keeps untouched lines and rebuilds only the edited one', () => {
    const doc = parseStickyNoteRichDoc('* keep\n* edit me');
    const list = doc.content?.[0];
    const edited = list?.content?.[1];
    if (!edited?.content?.[0]) throw new Error('fixture');
    edited.content[0].content = [text('edited')];
    expect(serializeStickyNoteRichDoc(doc)).toBe('* keep\n- edited');
  });

  it('moves edge whitespace outside of markers', () => {
    const doc: StickyNoteRichNode = {
      content: [{ content: [text('make '), text('bold ', 'bold'), text('now')], type: 'paragraph' }],
      type: 'doc',
    };
    expect(serializeStickyNoteRichDoc(doc)).toBe('make **bold** now');
  });

  it('serializes toggled checkboxes', () => {
    const doc = parseStickyNoteRichDoc('- [ ] todo');
    const item = doc.content?.[0].content?.[0];
    if (!item) throw new Error('fixture');
    item.attrs = { ...item.attrs, checked: true };
    expect(serializeStickyNoteRichDoc(doc)).toBe('- [x] todo');
  });
});
