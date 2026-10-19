import { describe, expect, it } from 'vitest';

import {
  formatExistingPendingWarning,
  formatPendingProposalConflictError,
  formatReplacedPendingWarning,
  pendingProposalBlocksReplace,
  type PendingPlanPatchSnapshot,
} from './sprintPlanPatchPending';

const pending: PendingPlanPatchSnapshot = {
  draftNoteCount: 1,
  goalPreviewCount: 0,
  positionPreviewCount: 2,
  proposalId: 'abcdef123456',
};

describe('pendingProposalBlocksReplace', () => {
  it('blocks when proposal ids differ or pending id is unknown', () => {
    expect(pendingProposalBlocksReplace(pending, 'zzzzzzzzzzzz')).toBe(true);
    expect(pendingProposalBlocksReplace({ ...pending, proposalId: null }, 'abcdef123456')).toBe(
      true
    );
  });

  it('allows idempotent re-propose of the same proposal', () => {
    expect(pendingProposalBlocksReplace(pending, 'abcdef123456')).toBe(false);
  });
});

describe('pending proposal messages', () => {
  it('formats conflict, replace, and dry-run warnings', () => {
    expect(formatPendingProposalConflictError(pending)).toContain('replacePending=true');
    expect(formatPendingProposalConflictError(pending, ['position RND-1: a → b'])).toContain(
      'position RND-1: a → b'
    );
    expect(formatReplacedPendingWarning(pending)).toContain('replaced_pending_proposal');
    expect(formatExistingPendingWarning(pending)).toContain('pending_proposal_on_board');
  });
});
