import { peekPlanPatchGoalPreviewProposal } from '@/lib/sprints/sprintPlanPatchGoalPreviewRepository';
import {
  countPendingPlanPatchSprintComments,
  peekPendingPlanPatchCommentProposalId,
} from '@/lib/sprints/sprintPlanPatchPendingComments';
import { peekPlanPatchPositionPreviewProposal } from '@/lib/sprints/sprintPlanPatchPositionPreviewRepository';
import { proposalIdFromOpsHash } from '@/lib/sprints/sprintPlanPatchToken';

export interface PendingPlanPatchSnapshot {
  draftNoteCount: number;
  goalPreviewCount: number;
  positionPreviewCount: number;
  /** Short proposal id (12 chars) when known from previews or note hashes. */
  proposalId: string | null;
}

/** Неподтверждённый драфт пользователя в спринте (драфты приватны: у каждого свой). */
export async function loadPendingPlanPatchSnapshot(input: {
  organizationId: string;
  ownerId: string;
  sprintId: number;
}): Promise<PendingPlanPatchSnapshot | null> {
  const [positionPeek, goalPeek, draftNoteCount] = await Promise.all([
    peekPlanPatchPositionPreviewProposal(input),
    peekPlanPatchGoalPreviewProposal(input),
    countPendingPlanPatchSprintComments({ ownerId: input.ownerId, sprintId: input.sprintId }),
  ]);

  const positionPreviewCount = positionPeek?.count ?? 0;
  const goalPreviewCount = goalPeek?.count ?? 0;
  if (positionPreviewCount === 0 && goalPreviewCount === 0 && draftNoteCount === 0) {
    return null;
  }

  let proposalId = positionPeek?.proposalId ?? goalPeek?.proposalId ?? null;
  if (!proposalId && draftNoteCount > 0) {
    const noteHash = await peekPendingPlanPatchCommentProposalId({
      ownerId: input.ownerId,
      sprintId: input.sprintId,
    });
    proposalId = noteHash ? proposalIdFromOpsHash(noteHash) : null;
  }

  return {
    draftNoteCount,
    goalPreviewCount,
    positionPreviewCount,
    proposalId,
  };
}

/** Same ops re-propose is idempotent; different pending draft needs explicit replace. */
export function pendingProposalBlocksReplace(
  pending: PendingPlanPatchSnapshot,
  nextProposalId: string
): boolean {
  if (pending.proposalId == null) {
    return true;
  }
  return pending.proposalId !== nextProposalId;
}

export function formatPendingProposalConflictError(
  pending: PendingPlanPatchSnapshot,
  detailLines: readonly string[] = []
): string {
  const id = pending.proposalId ?? 'unknown';
  const head = [
    `pending_proposal_exists: proposalId=${id}`,
    `positionPreviews=${pending.positionPreviewCount}`,
    `goalPreviews=${pending.goalPreviewCount}`,
    `draftNotes=${pending.draftNoteCount}`,
    'Pass replacePending=true to discard the unconfirmed proposal, or apply/reject it first.',
  ].join('; ');
  if (detailLines.length === 0) {
    return head;
  }
  return `${head}\n${detailLines.join('\n')}`;
}

export function formatReplacedPendingWarning(pending: PendingPlanPatchSnapshot): string {
  const id = pending.proposalId ?? 'unknown';
  return `replaced_pending_proposal: discarded proposalId=${id} (positions=${pending.positionPreviewCount}, goals=${pending.goalPreviewCount}, notes=${pending.draftNoteCount})`;
}

export function formatExistingPendingWarning(pending: PendingPlanPatchSnapshot): string {
  const id = pending.proposalId ?? 'unknown';
  return `pending_proposal_on_board: proposalId=${id} (positions=${pending.positionPreviewCount}, goals=${pending.goalPreviewCount}, notes=${pending.draftNoteCount}) — dry-run did not replace it; pass persistNotes=true with replacePending=true to discard`;
}
