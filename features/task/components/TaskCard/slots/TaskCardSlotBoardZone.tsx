'use client';

import type {
  TaskCardCustomFieldPlacement,
  TaskCardFieldId,
  TaskCardFieldPlacement,
  TaskCardSlotId,
  TaskCardSlotLayout,
} from '@/lib/taskCard/taskCardSlots';
import type { ReactNode } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import {
  removeTaskCardCustomField,
  toggleTaskCardCustomFieldHidden,
  toggleTaskCardFieldHidden,
} from '@/lib/taskCard/taskCardSlotEdits';

import { TaskCardSlotChip } from './TaskCardSlotChip';
import { taskCardFieldLabel, taskCardSlotLabel } from './taskCardSlotLabels';
import { TaskCardSlotZone } from './TaskCardSlotZone';

export type TaskCardSlotBoardSelection =
  | { field: TaskCardFieldId; kind: 'builtin' }
  | { fieldId: string; kind: 'custom' }
  | null;

type SlotRow =
  | { kind: 'builtin'; order: number; placement: TaskCardFieldPlacement }
  | { kind: 'custom'; order: number; placement: TaskCardCustomFieldPlacement };

interface TaskCardSlotBoardZoneProps {
  alignEnd?: boolean;
  className?: string;
  layout: TaskCardSlotLayout;
  selected: TaskCardSlotBoardSelection;
  slot: TaskCardSlotId;
  suffix?: ReactNode;
  wrap?: boolean;
  onChange: (layout: TaskCardSlotLayout) => void;
  onSelect: (selected: TaskCardSlotBoardSelection) => void;
}

export function TaskCardSlotBoardZone({
  alignEnd = false,
  className,
  layout,
  onChange,
  onSelect,
  selected,
  slot,
  suffix,
  wrap,
}: TaskCardSlotBoardZoneProps) {
  const { t } = useI18n();
  const rows = slotRows(layout, slot);

  return (
    <TaskCardSlotZone
      alignEnd={alignEnd}
      className={className}
      dropId={slot}
      emptyLabel={t('settings.planningTab.cardSlots.emptySlot')}
      isEmpty={rows.length === 0}
      itemIds={rows.map((row) => slotRowId(row))}
      label={taskCardSlotLabel(slot, t)}
      suffix={suffix}
      wrap={wrap}
    >
      {rows.map((row) => {
        if (row.kind === 'custom') {
          const placement = row.placement;
          const label = placement.label || placement.fieldId;
          const chipSelected = selected?.kind === 'custom' && selected.fieldId === placement.fieldId;
          return (
            <TaskCardSlotChip
              key={placement.fieldId}
              data={{ fieldId: placement.fieldId, kind: 'custom' }}
              dragLabel={t('settings.planningTab.cardSlots.dragField', { field: label })}
              hidden={placement.hidden === true}
              id={`custom:${placement.fieldId}`}
              label={label}
              removeLabel={t('settings.planningTab.cardSlots.customFieldRemove', { field: label })}
              selected={chipSelected}
              visibilityLabel={visibilityLabel(placement.hidden === true, label, t)}
              onRemove={() => {
                onChange(removeTaskCardCustomField(layout, placement.fieldId));
                if (chipSelected) {
                  onSelect(null);
                }
              }}
              onSelect={() => {
                onSelect({ fieldId: placement.fieldId, kind: 'custom' });
              }}
              onToggleHidden={() => {
                onChange(toggleTaskCardCustomFieldHidden(layout, placement.fieldId));
              }}
            />
          );
        }
        const placement = row.placement;
        const label = taskCardFieldLabel(placement.field, t);
        const chipSelected = selected?.kind === 'builtin' && selected.field === placement.field;
        return (
          <TaskCardSlotChip
            key={placement.field}
            data={{ field: placement.field, kind: 'builtin' }}
            dragLabel={t('settings.planningTab.cardSlots.dragField', { field: label })}
            hidden={placement.hidden === true}
            id={`builtin:${placement.field}`}
            label={label}
            selected={chipSelected}
            visibilityLabel={visibilityLabel(placement.hidden === true, label, t)}
            onSelect={() => {
              onSelect(chipSelected ? null : { field: placement.field, kind: 'builtin' });
            }}
            onToggleHidden={() => {
              onChange(toggleTaskCardFieldHidden(layout, placement.field));
            }}
          />
        );
      })}
    </TaskCardSlotZone>
  );
}

function slotRows(layout: TaskCardSlotLayout, slot: TaskCardSlotId): SlotRow[] {
  const builtins: SlotRow[] = layout.placements
    .filter((placement) => placement.slot === slot)
    .map((placement) => ({ kind: 'builtin', order: placement.order, placement }));
  const customs: SlotRow[] = layout.customPlacements
    .filter((placement) => placement.slot === slot)
    .map((placement) => ({ kind: 'custom', order: placement.order, placement }));
  return [...builtins, ...customs].sort((left, right) => left.order - right.order);
}

function slotRowId(row: SlotRow): string {
  return row.kind === 'builtin' ? `builtin:${row.placement.field}` : `custom:${row.placement.fieldId}`;
}

function visibilityLabel(
  hidden: boolean,
  field: string,
  t: (key: string, params?: Record<string, number | string>) => string
): string {
  return t(hidden ? 'settings.planningTab.cardSlots.showField' : 'settings.planningTab.cardSlots.hideField', { field });
}
