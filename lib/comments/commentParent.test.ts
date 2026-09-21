import { describe, expect, it } from 'vitest';

import {
  commentParentToJsonb,
  parseCommentParent,
  readCommentParentUpdate,
} from './commentParent';

const parent = {
  display: 'Story title',
  id: 'story-1',
  key: 'BT-10',
};

describe('parseCommentParent', () => {
  it('reads a valid parent and ignores incomplete payloads', () => {
    expect(parseCommentParent({ ...parent, self: ' https://t/BT-10 ' })).toEqual({
      ...parent,
      self: 'https://t/BT-10',
    });
    expect(parseCommentParent({ ...parent, display: '  Story title  ' })).toEqual(parent);
    expect(parseCommentParent(null)).toBeUndefined();
    expect(parseCommentParent({ id: 'story-1', key: 'BT-10' })).toBeUndefined();
  });
});

describe('commentParentToJsonb', () => {
  it('serializes a parent and maps empty to null', () => {
    expect(commentParentToJsonb(null)).toBeNull();
    expect(JSON.parse(commentParentToJsonb(parent) ?? '')).toEqual(parent);
  });
});

describe('readCommentParentUpdate', () => {
  it('distinguishes missing, clear, valid and invalid parent fields', () => {
    expect(readCommentParentUpdate({})).toEqual({ provided: false });
    expect(readCommentParentUpdate({ parent: null })).toEqual({ provided: true, parent: null });
    expect(readCommentParentUpdate({ parent })).toEqual({ provided: true, parent });
    expect(readCommentParentUpdate({ parent: { key: 'BT-10' } })).toEqual({ provided: false });
  });
});
