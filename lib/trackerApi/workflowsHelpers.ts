interface WorkflowStepAction {
  id: string;
  key?: string;
  name?: string;
  screen?: { id: string };
  target?: { key?: string };
}

interface WorkflowStep {
  actions?: WorkflowStepAction[];
  metaAction?: WorkflowStepAction;
  status?: { key?: string };
}

export interface ScreenElement {
  field: { id: string; display?: string };
  required: boolean;
}

function pushRowScreenElements(
  out: ScreenElement[],
  row: { elements?: ScreenElement[] }
): void {
  if (Array.isArray(row.elements)) {
    out.push(...row.elements);
  }
}

function screenElementsFromColumns(data: Record<string, unknown>): ScreenElement[] {
  const columns = data.columns as Array<{ rows?: Array<{ elements?: ScreenElement[] }> }> | undefined;
  if (!Array.isArray(columns)) {
    return [];
  }
  const out: ScreenElement[] = [];
  for (const col of columns) {
    for (const row of col.rows ?? []) {
      pushRowScreenElements(out, row);
    }
  }
  return out;
}

function screenElementsFromRecord(data: Record<string, unknown>): ScreenElement[] {
  if (Array.isArray(data.elements) && data.elements.length > 0) {
    return data.elements as ScreenElement[];
  }
  return screenElementsFromColumns(data);
}

export function extractScreenElements(data: Record<string, unknown>): ScreenElement[] {
  let els = screenElementsFromRecord(data);
  if (els.length === 0 && data.content && typeof data.content === 'object') {
    els = screenElementsFromRecord(data.content as Record<string, unknown>);
  }
  return els;
}

function mapScreenElementsToTransitionFields(
  elements: ScreenElement[]
): Array<{ display: string; id: string; required: boolean }> {
  return elements.map((el) => ({
    id: el.field.id,
    display: el.field.display || el.field.id,
    required: el.required,
  }));
}

function workflowStepActions(step: WorkflowStep): WorkflowStepAction[] {
  return [...(step.actions ?? []), ...(step.metaAction ? [step.metaAction] : [])];
}

async function resolveTransitionScreenFields(
  action: WorkflowStepAction,
  resolveScreen: (screenId: string) => Promise<{ elements: ScreenElement[] }>
): Promise<{ fields: Array<{ display: string; id: string; required: boolean }>; transitionKey: string; targetMeta: string | null } | null> {
  if (!action?.id || !action.screen?.id) {
    return null;
  }
  const transitionKey = action.key || action.id;
  const screen = await resolveScreen(action.screen.id);
  if (!screen.elements?.length) {
    return null;
  }
  const fields = mapScreenElementsToTransitionFields(screen.elements);
  const targetMeta = action.target?.key ? `${action.target.key}Meta` : null;
  return { fields, transitionKey, targetMeta };
}

function registerResolvedTransition(
  transitionScreens: Record<string, Array<{ display: string; id: string; required: boolean }>>,
  resolved: {
    fields: Array<{ display: string; id: string; required: boolean }>;
    targetMeta: string | null;
    transitionKey: string;
  }
): void {
  transitionScreens[resolved.transitionKey] = resolved.fields;
  if (resolved.targetMeta && resolved.transitionKey !== resolved.targetMeta) {
    transitionScreens[resolved.targetMeta] = resolved.fields;
  }
}

async function collectStepTransitionScreens(
  step: WorkflowStep,
  resolveScreen: (screenId: string) => Promise<{ elements: ScreenElement[] }>,
  transitionScreens: Record<string, Array<{ display: string; id: string; required: boolean }>>
): Promise<void> {
  for (const action of workflowStepActions(step)) {
    const resolved = await resolveTransitionScreenFields(action, resolveScreen);
    if (resolved) {
      registerResolvedTransition(transitionScreens, resolved);
    }
  }
}

export async function collectTransitionScreensForWorkflow(
  workflow: { steps: WorkflowStep[] },
  resolveScreen: (screenId: string) => Promise<{ elements: ScreenElement[] }>
): Promise<Record<string, Array<{ display: string; id: string; required: boolean }>>> {
  const transitionScreens: Record<string, Array<{ display: string; id: string; required: boolean }>> = {};

  for (const step of workflow.steps || []) {
    await collectStepTransitionScreens(step, resolveScreen, transitionScreens);
  }

  return transitionScreens;
}
