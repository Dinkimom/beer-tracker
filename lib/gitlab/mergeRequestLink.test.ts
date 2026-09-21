import { describe, expect, it } from 'vitest';

import { parseGitLabMergeRequestLink } from './mergeRequestLink';

describe('parseGitLabMergeRequestLink', () => {
  it('parses /-/merge_requests links', () => {
    expect(
      parseGitLabMergeRequestLink('https://gitlab.example/group/subgroup/proj/-/merge_requests/42')
    ).toEqual({
      baseUrl: 'https://gitlab.example',
      projectPath: 'group/subgroup/proj',
      iid: '42',
    });
  });

  it('parses /merge_requests links without dash segment', () => {
    expect(parseGitLabMergeRequestLink('https://gitlab.example/group/proj/merge_requests/11')).toEqual({
      baseUrl: 'https://gitlab.example',
      projectPath: 'group/proj',
      iid: '11',
    });
  });

  it('returns null for non-mr links', () => {
    expect(parseGitLabMergeRequestLink('https://gitlab.example/group/proj/issues/11')).toBeNull();
  });
});
