import type { TrackerIssue } from '@/types/tracker';

function isQaFunctionalTeam(issue: TrackerIssue): boolean {
  const t = (issue.functionalTeam ?? '').toLowerCase();
  return t.includes('qa') || t.includes('tester');
}

export function isDoneForSprintScore(issue: TrackerIssue): boolean {
  const k = (issue.status?.key ?? issue.statusType?.key ?? '').toLowerCase();
  return k === 'closed' || k === 'done' || k === 'resolved';
}

function accumulateQaSprintScore(
  issue: TrackerIssue,
  done: boolean,
  totals: { qaDone: number; qaLeft: number }
): void {
  const tp = issue.testPoints ?? 0;
  if (done) totals.qaDone += tp;
  else totals.qaLeft += tp;
}

function accumulateDevSprintScore(
  issue: TrackerIssue,
  done: boolean,
  totals: { spDone: number; spLeft: number }
): void {
  const sp = issue.storyPoints ?? 0;
  if (done) totals.spDone += sp;
  else totals.spLeft += sp;
}

function accumulateIssueSprintScore(
  issue: TrackerIssue,
  totals: { qaDone: number; qaLeft: number; spDone: number; spLeft: number }
): void {
  const done = isDoneForSprintScore(issue);
  if (isQaFunctionalTeam(issue)) {
    accumulateQaSprintScore(issue, done, totals);
    return;
  }
  accumulateDevSprintScore(issue, done, totals);
}

export function aggregateSprintScorePoints(issues: TrackerIssue[]): {
  qa_done: number;
  qa_left: number;
  sp_done: number;
  sp_left: number;
} {
  const totals = { qaDone: 0, qaLeft: 0, spDone: 0, spLeft: 0 };
  for (const issue of issues) {
    accumulateIssueSprintScore(issue, totals);
  }
  return {
    qa_done: Math.round(totals.qaDone),
    qa_left: Math.round(totals.qaLeft),
    sp_done: Math.round(totals.spDone),
    sp_left: Math.round(totals.spLeft),
  };
}
