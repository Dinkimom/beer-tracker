import { describe, expect, it, vi } from 'vitest';

import {
  commentToSwimlaneNoteClipboard,
  writeNoteTextToSystemClipboard,
} from './swimlaneNoteClipboard';

describe('commentToSwimlaneNoteClipboard', () => {
  it('copies text, color and size from a note', () => {
    expect(
      commentToSwimlaneNoteClipboard({
        color: 'pink',
        height: 3,
        text: 'Standup',
        width: 4,
      })
    ).toEqual({
      color: 'pink',
      height: 3,
      text: 'Standup',
      width: 4,
    });
  });

  it('rejects photos, diagrams and empty notes', () => {
    expect(
      commentToSwimlaneNoteClipboard({
        color: 'yellow',
        height: 2,
        kind: 'image',
        text: 'shot',
        width: 2,
      })
    ).toBeNull();
    expect(
      commentToSwimlaneNoteClipboard({
        color: 'yellow',
        height: 2,
        kind: 'diagram',
        text: 'Schema',
        width: 2,
      })
    ).toBeNull();
    expect(
      commentToSwimlaneNoteClipboard({
        color: 'yellow',
        height: 2,
        text: '   ',
        width: 2,
      })
    ).toBeNull();
  });
});

describe('writeNoteTextToSystemClipboard', () => {
  it('replaces the system clipboard with the note text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await writeNoteTextToSystemClipboard('Standup');

    expect(writeText).toHaveBeenCalledWith('Standup');
    vi.unstubAllGlobals();
  });
});
