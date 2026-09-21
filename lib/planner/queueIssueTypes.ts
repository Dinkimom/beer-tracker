interface WorkflowTypeRow { display?: string; id: string; key: string; }

export interface QueueIssueTypeOption {
  key: string;
  label: string;
}

function appendWorkflowIssueTypes(
  typeList: WorkflowTypeRow[] | undefined,
  seen: Set<string>,
  out: QueueIssueTypeOption[]
): void {
  for (const row of typeList ?? []) {
    const key = row.key?.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    const display = row.display?.trim();
    out.push({ key, label: display || key });
  }
}

/** Типы задач из ответа Tracker GET /queues/{key}/workflows (объединение по всем workflow). */
export function flattenQueueIssueTypes(
  workflows: Record<string, WorkflowTypeRow[]>
): QueueIssueTypeOption[] {
  const seen = new Set<string>();
  const out: QueueIssueTypeOption[] = [];

  for (const typeList of Object.values(workflows)) {
    appendWorkflowIssueTypes(typeList, seen, out);
  }

  return out.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
