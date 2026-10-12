import { describe, expect, it } from 'vitest';

import {
  addTaskCardCustomField,
  arrangeTaskCardSlots,
  moveTaskCardField,
  moveTaskCardSlotItem,
  taskCardSlotItemGroups,
  toggleTaskCardFieldHidden,
  updateTaskCardCustomField,
  updateTaskCardFieldPlacement,
} from './taskCardSlotEdits';
import { taskCardSlotPresetLayout } from './taskCardSlotPresets';
import {
  defaultTaskCardSlotLayout,
  layoutFromVisibility,
  normalizeTaskCardSlotLayout,
  resolveTaskCardSlots,
  taskCardDensityFromDuration,
  taskCardFieldsSuppressedByKind,
  taskCardLayoutReservesEyebrow,
  taskCardSlotLayoutsEqual,
  visibilityFromLayout,
  type TaskCardSlotLayout,
} from './taskCardSlots';

const fullData = {
  hasAssignee: true,
  hasEstimate: true,
  hasKey: true,
  hasParent: true,
  hasPriority: true,
  hasSeverity: true,
  hasStatus: true,
  hasType: true,
};

function fieldsOf(layout: TaskCardSlotLayout, density: 'compact' | 'narrow' | 'regular' = 'regular') {
  const resolved = resolveTaskCardSlots({
    ...fullData,
    density,
    layout,
  });
  return {
    eyebrow: resolved.eyebrow.map((item) => item.field),
    footer: resolved.footer.map((item) => `${item.field}:${item.presentation}`),
    footerEnd: resolved.footerEnd.map((item) => item.field),
    titleLead: resolved.titleLead.map((item) => `${item.field}:${item.presentation}`),
  };
}

describe('taskCardDensityFromDuration', () => {
  it('treats one cell as compact and two cells as narrow', () => {
    expect(taskCardDensityFromDuration(undefined)).toBe('regular');
    expect(taskCardDensityFromDuration(4)).toBe('regular');
    expect(taskCardDensityFromDuration(2)).toBe('narrow');
    expect(taskCardDensityFromDuration(1)).toBe('compact');
  });
});

describe('resolveTaskCardSlots', () => {
  it('matches the classic swimlane card', () => {
    expect(fieldsOf(defaultTaskCardSlotLayout())).toEqual({
      eyebrow: ['parent'],
      footer: ['status:tag', 'severity:tag', 'estimate:text'],
      footerEnd: ['assignee'],
      titleLead: ['priority:icon', 'type:icon', 'key:link'],
    });
  });

  it('drops the footer on a narrow card and the header row on a one-cell card', () => {
    const layout = defaultTaskCardSlotLayout();
    expect(fieldsOf(layout, 'narrow').footer).toEqual([]);
    expect(fieldsOf(layout, 'narrow').footerEnd).toEqual([]);
    expect(fieldsOf(layout, 'narrow').titleLead).toEqual([
      'priority:icon',
      'type:icon',
      'key:link',
    ]);
    expect(fieldsOf(layout, 'compact')).toEqual({
      eyebrow: [],
      footer: [],
      footerEnd: [],
      titleLead: [],
    });
  });

  it('hides a part only at the chosen width', () => {
    const layout: TaskCardSlotLayout = {
      ...defaultTaskCardSlotLayout(),
      hideEyebrow: 'underThree',
      hideFooter: 'one',
      hideTitleLead: 'never',
    };
    expect(fieldsOf(layout, 'narrow').eyebrow).toEqual([]);
    expect(fieldsOf(layout, 'narrow').titleLead).toEqual(['priority:icon', 'type:icon', 'key:link']);
    expect(fieldsOf(layout, 'narrow').footer).toContain('status:tag');
    expect(fieldsOf(layout, 'compact').titleLead).toEqual(['priority:icon', 'type:icon', 'key:link']);
    expect(fieldsOf(layout, 'compact').footer).toEqual([]);
    expect(fieldsOf(layout, 'regular').eyebrow).toContain('parent');
  });

  it('hides whichever fields sit in a short-card part', () => {
    const moved = updateTaskCardFieldPlacement(defaultTaskCardSlotLayout(), 'status', { slot: 'eyebrow' });
    expect(fieldsOf(moved, 'compact').eyebrow).toEqual([]);
    expect(fieldsOf({ ...moved, hideEyebrow: 'never' }, 'compact').eyebrow).toContain('status');
    expect(fieldsOf({ ...defaultTaskCardSlotLayout(), hideFooter: 'never' }, 'narrow').footerEnd).toEqual([
      'assignee',
    ]);
  });

  it('shows a tracker field when the task has a value for that key', () => {
    const layout = addTaskCardCustomField(defaultTaskCardSlotLayout(), {
      fieldId: 'customer',
      label: 'Customer',
    });
    const resolved = resolveTaskCardSlots({
      ...fullData,
      customFieldValues: { customer: 'Northwind' },
      density: 'regular',
      layout,
    });
    expect(resolved.footer).toContainEqual({
      customFieldId: 'customer',
      field: 'custom',
      label: 'Customer',
      presentation: 'text',
    });
  });

  it('keeps a short list value on the resolved card', () => {
    const layout = updateTaskCardCustomField(
      addTaskCardCustomField(defaultTaskCardSlotLayout(), {
        fieldId: 'customfield_10046',
        label: 'Need QA test',
      }),
      'customfield_10046',
      { valueLabel: { label: 'Уточнить', option: 'Needs clarification from the product owner' } }
    );
    const resolved = resolveTaskCardSlots({
      ...fullData,
      customFieldValues: { customfield_10046: 'Needs clarification from the product owner' },
      density: 'regular',
      layout,
    });
    expect(resolved.footer).toContainEqual({
      customFieldId: 'customfield_10046',
      field: 'custom',
      label: 'Need QA test',
      presentation: 'text',
      valueLabels: { 'Needs clarification from the product owner': 'Уточнить' },
    });
  });

  it('skips a tracker field the task does not have', () => {
    const layout = addTaskCardCustomField(defaultTaskCardSlotLayout(), { fieldId: 'customer' });
    const resolved = resolveTaskCardSlots({
      ...fullData,
      density: 'regular',
      layout,
    });
    expect(resolved.footer.map((item) => item.field)).not.toContain('custom');
  });

  it('shows the status footer on short cards for the short-card preset', () => {
    const layout = taskCardSlotPresetLayout('statusOnShortCards');
    expect(fieldsOf(layout, 'narrow').footer).toContain('status:tag');
    expect(fieldsOf(layout, 'compact').titleLead).toEqual([]);
    expect(fieldsOf(layout, 'compact').footer).toContain('status:tag');
  });

  it('omits a field the task does not have', () => {
    const resolved = resolveTaskCardSlots({
      ...fullData,
      density: 'regular',
      hasParent: false,
      hasSeverity: false,
      layout: defaultTaskCardSlotLayout(),
    });
    expect(resolved.eyebrow).toEqual([]);
    expect(resolved.footer.map((item) => item.field)).toEqual(['status', 'estimate']);
  });
});

describe('taskCardFieldsSuppressedByKind', () => {
  it('hides tracker fields on notes and the chooser, and title meta on local drafts', () => {
    expect(taskCardFieldsSuppressedByKind({ localDraftKind: 'comment' })).toEqual([
      'key',
      'priority',
      'type',
      'status',
      'severity',
      'estimate',
    ]);
    expect(taskCardFieldsSuppressedByKind({ isLocalTask: true })).toEqual([
      'key',
      'priority',
      'type',
      'status',
      'severity',
      'estimate',
    ]);
    expect(taskCardFieldsSuppressedByKind({ isLocalTask: true, localDraftKind: 'task' })).toEqual([
      'key',
      'priority',
      'type',
    ]);
    expect(taskCardFieldsSuppressedByKind({})).toEqual([]);
  });
});

describe('layoutFromVisibility', () => {
  it('turns disabled checkboxes into hidden placements and back', () => {
    const layout = layoutFromVisibility({
      showEstimates: false,
      showKey: true,
      showParent: false,
      showPriority: true,
      showSeverity: true,
      showStatus: false,
      showType: true,
    });
    expect(visibilityFromLayout(layout)).toMatchObject({
      showEstimates: false,
      showParent: false,
      showStatus: false,
    });
    expect(fieldsOf(layout).eyebrow).toEqual([]);
    expect(fieldsOf(layout).footer).toEqual(['severity:tag']);
  });
});

describe('normalizeTaskCardSlotLayout', () => {
  it('fills a partial saved layout from the classic defaults', () => {
    const layout = normalizeTaskCardSlotLayout({
      collapseFooterUntilWide: false,
      hideLeadMetaOnCompact: false,
      placements: [{ field: 'status', presentation: 'dot', slot: 'titleLead' }],
    });
    expect(layout.hideFooter).toBe('never');
    expect(layout.hideEyebrow).toBe('never');
    expect(layout.hideTitleLead).toBe('never');
    expect(layout.placements.find((item) => item.field === 'status')).toEqual({
      field: 'status',
      order: 4,
      presentation: 'dot',
      slot: 'titleLead',
    });
    expect(layout.placements.find((item) => item.field === 'parent')?.presentation).toBe('text');
    expect(layout.customPlacements).toEqual([]);
  });

  it('keeps an explicit hide rule over a legacy checkbox', () => {
    const layout = normalizeTaskCardSlotLayout({
      hideEyebrow: 'underThree',
      hideEyebrowOnCompact: false,
      hideFooterUntilWide: true,
    });
    expect(layout.hideEyebrow).toBe('underThree');
    expect(layout.hideFooter).toBe('underThree');
    expect(layout.hideTitleLead).toBe('one');
  });

  it('keeps a tracker field and drops an invalid key', () => {
    const layout = normalizeTaskCardSlotLayout({
      customPlacements: [
        { fieldId: 'customer', label: 'Customer', presentation: 'tag', slot: 'eyebrow' },
        { fieldId: 'not a key', label: 'Bad', presentation: 'text', slot: 'footer' },
      ],
    });
    expect(layout.customPlacements).toEqual([
      { fieldId: 'customer', label: 'Customer', order: 1000, presentation: 'tag', slot: 'eyebrow' },
    ]);
  });

  it('rejects a presentation the field cannot use', () => {
    const layout = normalizeTaskCardSlotLayout({
      placements: [{ field: 'parent', presentation: 'icon', slot: 'footer' }],
    });
    expect(layout.placements.find((item) => item.field === 'parent')).toEqual({
      field: 'parent',
      order: 0,
      presentation: 'text',
      slot: 'footer',
    });
  });
});

describe('taskCardLayoutReservesEyebrow', () => {
  it('reserves height for a parent or for a status lifted above the title', () => {
    expect(taskCardLayoutReservesEyebrow(defaultTaskCardSlotLayout())).toBe(true);
    const withoutParent = updateTaskCardFieldPlacement(defaultTaskCardSlotLayout(), 'parent', {
      presentation: 'hidden',
    });
    expect(taskCardLayoutReservesEyebrow(withoutParent)).toBe(false);
    expect(
      taskCardLayoutReservesEyebrow(
        addTaskCardCustomField(withoutParent, { fieldId: 'customer', label: 'Customer' })
      )
    ).toBe(false);
    const lifted = addTaskCardCustomField(withoutParent, { fieldId: 'customer' });
    expect(
      taskCardLayoutReservesEyebrow({
        ...lifted,
        customPlacements: lifted.customPlacements.map((placement) => ({ ...placement, slot: 'eyebrow' })),
      })
    ).toBe(true);
  });
});

describe('moveTaskCardField', () => {
  it('moves a hidden field and keeps the look', () => {
    const dotted = updateTaskCardFieldPlacement(defaultTaskCardSlotLayout(), 'status', {
      presentation: 'dot',
    });
    const hidden = toggleTaskCardFieldHidden(dotted, 'status');
    const moved = moveTaskCardField(hidden, 'status', 'eyebrow');
    expect(moved.placements.find((item) => item.field === 'status')).toEqual({
      field: 'status',
      hidden: true,
      order: 4,
      presentation: 'dot',
      slot: 'eyebrow',
    });
    expect(toggleTaskCardFieldHidden(moved, 'status').placements.find((item) => item.field === 'status')).toEqual({
      field: 'status',
      order: 4,
      presentation: 'dot',
      slot: 'eyebrow',
    });
  });
});

describe('arrangeTaskCardSlots', () => {
  it('reorders fields inside one row and shows that order on the card', () => {
    const groups = taskCardSlotItemGroups(defaultTaskCardSlotLayout());
    const arranged = arrangeTaskCardSlots(defaultTaskCardSlotLayout(), {
      ...groups,
      titleLead: ['builtin:key', 'builtin:priority', 'builtin:type'],
    });
    expect(fieldsOf(arranged).titleLead).toEqual(['key:link', 'priority:icon', 'type:icon']);
  });

  it('moves a field in front of another slot and keeps a stored order', () => {
    const groups = taskCardSlotItemGroups(defaultTaskCardSlotLayout());
    const moved = moveTaskCardSlotItem(groups, 'builtin:status', 'builtin:parent');
    expect(moved?.eyebrow).toEqual(['builtin:status', 'builtin:parent']);
    const arranged = arrangeTaskCardSlots(defaultTaskCardSlotLayout(), moved ?? groups);
    expect(fieldsOf(arranged).eyebrow).toEqual(['status', 'parent']);
    expect(normalizeTaskCardSlotLayout(arranged).placements.find((item) => item.field === 'status')?.order).toBe(0);
  });

  it('sorts a tracker field among the builtin fields of the same row', () => {
    const withCustomer = addTaskCardCustomField(defaultTaskCardSlotLayout(), { fieldId: 'customer' });
    const groups = taskCardSlotItemGroups(withCustomer);
    const footer = groups.footer.filter((id) => id !== 'custom:customer');
    const arranged = arrangeTaskCardSlots(withCustomer, {
      ...groups,
      footer: ['custom:customer', ...footer],
    });
    const resolved = resolveTaskCardSlots({
      ...fullData,
      customFieldValues: { customer: 'Northwind' },
      density: 'regular',
      layout: arranged,
    });
    expect(resolved.footer[0]).toMatchObject({ customFieldId: 'customer', field: 'custom' });
  });
});

describe('taskCardSlotLayoutsEqual', () => {
  it('treats a preset as equal to itself after normalization', () => {
    expect(
      taskCardSlotLayoutsEqual(
        taskCardSlotPresetLayout('statusOnShortCards'),
        taskCardSlotPresetLayout('statusOnShortCards')
      )
    ).toBe(true);
    expect(
      taskCardSlotLayoutsEqual(taskCardSlotPresetLayout('statusOnShortCards'), defaultTaskCardSlotLayout())
    ).toBe(false);
  });
});
