function resolveQuarterlyTaskName(
  displayKey: string,
  taskName: string | undefined,
  untitledLabel: string
): { key: string; name: string } {
  const key = displayKey.trim();
  const raw = taskName?.trim();
  const name =
    raw && (!key || raw.toLocaleUpperCase() !== key.toLocaleUpperCase())
      ? raw
      : untitledLabel;
  return { key, name };
}

/** Части подписи: ключ (ссылка) и название после « - ». */
export function getQuarterlyTaskTitleParts(
  displayKey: string,
  taskName: string | undefined,
  untitledLabel: string
): { key: string; linkKey: string | null; title: string | null; plainText: string | null } {
  const { key, name } = resolveQuarterlyTaskName(displayKey, taskName, untitledLabel);
  if (!key) {
    return { key: '', linkKey: null, title: null, plainText: name };
  }
  if (name === untitledLabel || name.toLocaleUpperCase() === key.toLocaleUpperCase()) {
    return { key, linkKey: key, title: null, plainText: null };
  }
  return { key, linkKey: key, title: name, plainText: null };
}

/** Подпись «KEY - название»; без дублирования, если название совпадает с ключом. */
export function formatQuarterlyTaskTitleLabel(
  displayKey: string,
  taskName: string | undefined,
  untitledLabel: string
): string {
  const parts = getQuarterlyTaskTitleParts(displayKey, taskName, untitledLabel);
  if (parts.plainText != null) return parts.plainText;
  if (parts.title == null) return parts.linkKey ?? '';
  return `${parts.linkKey} - ${parts.title}`;
}
