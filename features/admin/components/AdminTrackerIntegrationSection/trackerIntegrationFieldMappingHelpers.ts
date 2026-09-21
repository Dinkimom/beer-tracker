import type { CustomSelectOption } from '@/components/CustomSelect';
import type { Dispatch, SetStateAction } from 'react';

type Translate = (key: string) => string;

type ProcessSetupFieldOptionsKind = 'any' | 'numeric';

interface ProcessSetupFieldMappingRow {
  id: string;
  label: string;
  optionsKind: ProcessSetupFieldOptionsKind;
  setter: Dispatch<SetStateAction<string>>;
  value: string;
}

function mergeRequestFieldMappingRow(
  t: Translate,
  setReleaseMrFieldId: Dispatch<SetStateAction<string>>,
  releaseMrFieldId: string
): ProcessSetupFieldMappingRow {
  return {
    id: 'ti-mr',
    label: t('admin.plannerIntegration.field.mergeRequest'),
    optionsKind: 'any',
    setter: setReleaseMrFieldId,
    value: releaseMrFieldId,
  };
}

export function embeddedProcessSetupFieldRows(
  t: Translate,
  setters: {
    setDevAssigneeFieldId: Dispatch<SetStateAction<string>>;
    setDevEstimateFieldId: Dispatch<SetStateAction<string>>;
    setQaEngineerFieldId: Dispatch<SetStateAction<string>>;
    setQaEstimateFieldId: Dispatch<SetStateAction<string>>;
    setReleaseMrFieldId: Dispatch<SetStateAction<string>>;
  },
  values: {
    devAssigneeFieldId: string;
    devEstimateFieldId: string;
    qaEngineerFieldId: string;
    qaEstimateFieldId: string;
    releaseMrFieldId: string;
  }
): ProcessSetupFieldMappingRow[] {
  return [
    {
      id: 'ti-dev-est',
      label: t('admin.plannerIntegration.field.devEstimateEmbedded'),
      optionsKind: 'numeric',
      setter: setters.setDevEstimateFieldId,
      value: values.devEstimateFieldId,
    },
    {
      id: 'ti-qa-est',
      label: t('admin.plannerIntegration.field.qaEstimateEmbedded'),
      optionsKind: 'numeric',
      setter: setters.setQaEstimateFieldId,
      value: values.qaEstimateFieldId,
    },
    {
      id: 'ti-qa-eng',
      label: t('admin.plannerIntegration.field.qaEngineer'),
      optionsKind: 'any',
      setter: setters.setQaEngineerFieldId,
      value: values.qaEngineerFieldId,
    },
    {
      id: 'ti-dev-asg',
      label: t('admin.plannerIntegration.field.devAssigneeEmbedded'),
      optionsKind: 'any',
      setter: setters.setDevAssigneeFieldId,
      value: values.devAssigneeFieldId,
    },
    mergeRequestFieldMappingRow(t, setters.setReleaseMrFieldId, values.releaseMrFieldId),
  ];
}

export function standaloneProcessSetupFieldRows(
  t: Translate,
  setters: {
    setDevAssigneeFieldId: Dispatch<SetStateAction<string>>;
    setDevEstimateFieldId: Dispatch<SetStateAction<string>>;
    setReleaseMrFieldId: Dispatch<SetStateAction<string>>;
  },
  values: {
    devAssigneeFieldId: string;
    devEstimateFieldId: string;
    releaseMrFieldId: string;
  }
): ProcessSetupFieldMappingRow[] {
  return [
    {
      id: 'ti-dev-asg',
      label: t('admin.plannerIntegration.field.devAssigneeStandalone'),
      optionsKind: 'any',
      setter: setters.setDevAssigneeFieldId,
      value: values.devAssigneeFieldId,
    },
    {
      id: 'ti-dev-est',
      label: t('admin.plannerIntegration.field.estimateStandalone'),
      optionsKind: 'numeric',
      setter: setters.setDevEstimateFieldId,
      value: values.devEstimateFieldId,
    },
    mergeRequestFieldMappingRow(t, setters.setReleaseMrFieldId, values.releaseMrFieldId),
  ];
}

export function processSetupFieldMappingSelectOptions(
  kind: ProcessSetupFieldOptionsKind,
  lists: Record<ProcessSetupFieldOptionsKind, CustomSelectOption<string>[]>
): CustomSelectOption<string>[] {
  return lists[kind];
}
