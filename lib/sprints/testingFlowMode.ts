export type TrackerTestingFlowMode =
  | 'embedded_in_dev'
  | 'standalone_qa_tasks'
  | 'unknown';

export function resolveTrackerTestingFlowMode(
  integration: { testingFlow?: { mode?: string } } | null | undefined
): TrackerTestingFlowMode {
  if (integration?.testingFlow?.mode === 'standalone_qa_tasks') {
    return 'standalone_qa_tasks';
  }
  if (integration) {
    return 'embedded_in_dev';
  }
  return 'unknown';
}
