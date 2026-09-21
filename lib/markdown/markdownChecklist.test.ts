import { describe, expect, it } from 'vitest';

import {
  collectMarkdownCheckboxLineIndices,
  countMarkdownChecklistProgress,
  isMarkdownCheckboxLine,
  stickyNoteUsesMarkdownLayout,
  toggleMarkdownCheckboxAtLine,
} from './markdownChecklist';

describe('markdownChecklist', () => {
  it('detects GFM checkbox lines', () => {
    expect(isMarkdownCheckboxLine('- [ ] Todo')).toBe(true);
    expect(isMarkdownCheckboxLine('- [x] Done')).toBe(true);
    expect(isMarkdownCheckboxLine('* [X] Also done')).toBe(true);
    expect(isMarkdownCheckboxLine('1. [ ] Numbered')).toBe(true);
    expect(isMarkdownCheckboxLine('[ ] Standalone')).toBe(true);
    expect(isMarkdownCheckboxLine('[] Empty brackets')).toBe(true);
    expect(isMarkdownCheckboxLine('[x] Checked standalone')).toBe(true);
    expect(isMarkdownCheckboxLine('- plain bullet')).toBe(false);
  });

  it('collects checkbox line indices in order', () => {
    const markdown = 'Intro\n- [ ] one\n- [x] two\n## Head\n- [ ] three';
    expect(collectMarkdownCheckboxLineIndices(markdown)).toEqual([1, 2, 4]);
  });

  it('toggles unchecked to checked and back', () => {
    const markdown = '- [ ] Item\n- [x] Done';
    expect(toggleMarkdownCheckboxAtLine(markdown, 0)).toBe('- [x] Item\n- [x] Done');
    expect(toggleMarkdownCheckboxAtLine(markdown, 1)).toBe('- [ ] Item\n- [ ] Done');
    expect(toggleMarkdownCheckboxAtLine('[ ] Solo', 0)).toBe('[x] Solo');
  });

  it('returns original markdown for non-checkbox lines', () => {
    const markdown = 'Plain text';
    expect(toggleMarkdownCheckboxAtLine(markdown, 0)).toBe(markdown);
  });

  it('counts checklist progress', () => {
    expect(
      countMarkdownChecklistProgress('- [x] A\n- [ ] B\n- [X] C\n- plain')
    ).toEqual({ done: 2, total: 3 });
  });

  it('detects markdown layout for sticky notes', () => {
    expect(stickyNoteUsesMarkdownLayout('- [ ] item')).toBe(true);
    expect(stickyNoteUsesMarkdownLayout('[ ] item')).toBe(true);
    expect(stickyNoteUsesMarkdownLayout('[] item')).toBe(true);
    expect(stickyNoteUsesMarkdownLayout('## Blockers')).toBe(true);
    expect(stickyNoteUsesMarkdownLayout('Plain note with @mention')).toBe(false);
  });
});
