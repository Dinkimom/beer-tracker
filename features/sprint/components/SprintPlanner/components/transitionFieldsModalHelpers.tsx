import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import React from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { Input } from '@/components/Input';
import { IsoDatePickerField } from '@/components/IsoDatePickerField';
import { TextArea } from '@/components/TextArea';
import { SprintSelector } from '@/features/sprint/components/SprintSelector';
import { TRANSITION_FIELD_ID_TO_TASK_KEY } from '@/features/sprint/utils/mergeTransitionFieldsIntoTask';

import { MultiUserSelector } from './MultiUserSelector';
import {
  decodeMultiUserFieldValue,
  encodeMultiUserFieldValue,
} from './multiUserSelectorHelpers';
import { UserSelector } from './UserSelector';

/** Cache/fallback ids when workflow screens omit schemaType/schemaItems. */
const KNOWN_MULTI_USER_FIELD_IDS = new Set(['reviewers', 'followers']);

export function isMultiUserTransitionField(field: TransitionField): boolean {
  if (field.schemaType === 'array' && field.schemaItems === 'user') {
    return true;
  }
  if (field.schemaType === 'array' && KNOWN_MULTI_USER_FIELD_IDS.has(field.id)) {
    return true;
  }
  return !field.schemaType && KNOWN_MULTI_USER_FIELD_IDS.has(field.id);
}

export function isSingleUserTransitionField(field: TransitionField): boolean {
  return field.schemaType === 'user' && !isMultiUserTransitionField(field);
}

function formatTransitionFieldPrimitive(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function extractTransitionRefId(item: unknown): string | null {
  if (typeof item === 'string' && item.trim()) return item.trim();
  if (item && typeof item === 'object' && 'id' in item) {
    const id = (item as { id: unknown }).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (typeof id === 'number') return String(id);
  }
  return null;
}

function formatTransitionFieldArrayFirst(v: unknown[]): string {
  if (v.length === 0) return '';
  return extractTransitionRefId(v[0]) ?? String(v[0]);
}

function formatTransitionFieldUserArray(v: unknown[]): string {
  const ids: string[] = [];
  for (const item of v) {
    const id = extractTransitionRefId(item);
    if (id) ids.push(id);
  }
  return encodeMultiUserFieldValue(ids);
}

function getTransitionTaskFieldValue(
  task: Task | null | undefined,
  field: TransitionField
): string {
  if (!task) return '';
  const taskKey = TRANSITION_FIELD_ID_TO_TASK_KEY[field.id] ?? field.id;
  const v = (task as unknown as Record<string, unknown>)[taskKey];
  if (Array.isArray(v)) {
    return isMultiUserTransitionField(field)
      ? formatTransitionFieldUserArray(v)
      : formatTransitionFieldArrayFirst(v);
  }
  return formatTransitionFieldPrimitive(v);
}

export function buildTransitionInitialValues(
  fields: TransitionField[],
  task: Task | null | undefined
): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const f of fields) {
    const v = getTransitionTaskFieldValue(task, f);
    if (v) initial[f.id] = v;
  }
  return initial;
}

function appendTransitionFieldToBody(
  body: Record<string, unknown>,
  field: TransitionField,
  value: string
): void {
  if (isMultiUserTransitionField(field)) {
    const ids = decodeMultiUserFieldValue(value);
    if (ids.length === 0) return;
    body[field.id] = ids.map((id) => ({ id }));
    return;
  }
  if (field.id === 'sprint' && field.schemaType === 'array') {
    body[field.id] = [{ id: value }];
    return;
  }
  if (field.schemaType === 'array') {
    body[field.id] = [value];
    return;
  }
  if (isSingleUserTransitionField(field)) {
    body[field.id] = { id: value };
    return;
  }
  body[field.id] = value;
}

export function buildTransitionSubmitBody(
  fields: TransitionField[],
  values: Record<string, string>
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.id];
    if (v === undefined || v === '') continue;
    appendTransitionFieldToBody(body, f, v);
  }
  return body;
}

export function validateTransitionRequiredFields(
  fields: TransitionField[],
  values: Record<string, string>
): string | null {
  const required = fields.filter((f) => f.required);
  const missing = required.filter((f) => !values[f.id]?.trim());
  if (missing.length === 0) return null;
  return `Заполните обязательные поля: ${missing.map((f) => f.display).join(', ')}`;
}

function isLongTransitionTextField(field: TransitionField): boolean {
  return field.id === 'comment' || (field.schemaType === 'string' && field.display?.toLowerCase().includes('коммент'));
}

function normalizeTransitionSelectOption(
  opt: NonNullable<TransitionField['options']>[number]
): { label: string; value: string } {
  return typeof opt === 'string' ? { label: opt, value: opt } : { label: opt.label, value: opt.value };
}

function isResolutionTransitionField(field: TransitionField): boolean {
  return field.id === 'resolution' || field.schemaType === 'resolution';
}

function renderTransitionSelectField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void
): React.ReactNode {
  const selectOptions = [
    { label: 'Не выбрано', value: '' },
    ...(field.options ?? []).map(normalizeTransitionSelectOption),
  ];
  return (
    <CustomSelect<string>
      key={field.id}
      className="mt-1 w-full"
      options={selectOptions}
      title={field.display}
      value={value}
      onChange={(v) => handleChange(field.id, v)}
    />
  );
}

function renderTransitionTextAreaField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void,
  inputClassName: string
): React.ReactNode {
  return (
    <TextArea
      key={field.id}
      className={inputClassName}
      placeholder={field.display}
      required={field.required}
      rows={3}
      value={value}
      onChange={(e) => handleChange(field.id, e.target.value)}
    />
  );
}

function renderTransitionDateField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void,
  _inputClassName: string
): React.ReactNode {
  return (
    <IsoDatePickerField
      key={field.id}
      placeholder={field.display}
      value={value}
      onChange={(iso) => handleChange(field.id, iso)}
    />
  );
}

function renderTransitionSprintField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void,
  sprints: SprintListItem[]
): React.ReactNode {
  const sprintId = value ? parseInt(value, 10) : null;
  return (
    <SprintSelector
      key={field.id}
      className="mt-1 w-full"
      inModal
      selectedSprintId={Number.isNaN(sprintId) ? null : sprintId}
      sprints={sprints}
      onSprintChange={(id) => handleChange(field.id, id !== null ? String(id) : '')}
    />
  );
}

function renderTransitionUserField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void
): React.ReactNode {
  return (
    <UserSelector
      key={field.id}
      className="mt-1 w-full"
      title={field.display}
      value={value}
      onChange={(v) => handleChange(field.id, v)}
    />
  );
}

function renderTransitionMultiUserField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void
): React.ReactNode {
  return (
    <MultiUserSelector
      key={field.id}
      className="mt-1 w-full"
      title={field.display}
      value={value}
      onChange={(v) => handleChange(field.id, v)}
    />
  );
}

function renderTransitionNumberField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void,
  inputClassName: string
): React.ReactNode {
  return (
    <Input
      key={field.id}
      className={inputClassName}
      placeholder={field.display}
      required={field.required}
      step={field.schemaType === 'float' ? 'any' : 1}
      type="number"
      value={value}
      onChange={(e) => handleChange(field.id, e.target.value)}
    />
  );
}

function renderTransitionDefaultTextField(
  field: TransitionField,
  value: string,
  handleChange: (fieldId: string, value: string) => void,
  inputClassName: string
): React.ReactNode {
  return (
    <Input
      key={field.id}
      className={inputClassName}
      placeholder={field.display}
      required={field.required}
      type="text"
      value={value}
      onChange={(e) => handleChange(field.id, e.target.value)}
    />
  );
}

type TransitionFieldRenderer = (input: {
  field: TransitionField;
  handleChange: (fieldId: string, value: string) => void;
  inputClassName: string;
  sprints: SprintListItem[];
  value: string;
}) => React.ReactNode;

const TRANSITION_FIELD_RENDERERS: Array<{
  match: (field: TransitionField) => boolean;
  render: TransitionFieldRenderer;
}> = [
  {
    match: (field) =>
      isResolutionTransitionField(field) || Boolean(field.options && field.options.length > 0),
    render: (input) => renderTransitionSelectField(input.field, input.value, input.handleChange),
  },
  {
    match: (field) =>
      (field.id === 'comment' || field.schemaType === 'string') && isLongTransitionTextField(field),
    render: (input) =>
      renderTransitionTextAreaField(input.field, input.value, input.handleChange, input.inputClassName),
  },
  {
    match: (field) => field.schemaType === 'date',
    render: (input) =>
      renderTransitionDateField(input.field, input.value, input.handleChange, input.inputClassName),
  },
  {
    match: (field) => field.id === 'sprint',
    render: (input) =>
      renderTransitionSprintField(input.field, input.value, input.handleChange, input.sprints),
  },
  {
    match: (field) => isMultiUserTransitionField(field),
    render: (input) =>
      renderTransitionMultiUserField(input.field, input.value, input.handleChange),
  },
  {
    match: (field) => isSingleUserTransitionField(field),
    render: (input) => renderTransitionUserField(input.field, input.value, input.handleChange),
  },
  {
    match: (field) => field.schemaType === 'float' || field.schemaType === 'integer',
    render: (input) =>
      renderTransitionNumberField(input.field, input.value, input.handleChange, input.inputClassName),
  },
];

function resolveTransitionFieldRenderer(field: TransitionField): TransitionFieldRenderer {
  return (
    TRANSITION_FIELD_RENDERERS.find((entry) => entry.match(field))?.render ??
    ((input) =>
      renderTransitionDefaultTextField(
        input.field,
        input.value,
        input.handleChange,
        input.inputClassName
      ))
  );
}

export function renderTransitionFieldInput(input: {
  field: TransitionField;
  handleChange: (fieldId: string, value: string) => void;
  inputClassName: string;
  sprints: SprintListItem[];
  value: string;
}): React.ReactNode {
  return resolveTransitionFieldRenderer(input.field)(input);
}
