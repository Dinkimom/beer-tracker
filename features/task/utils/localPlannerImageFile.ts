import { isPlannerImageContentType, PLANNER_IMAGE_MAX_BYTES } from '@/lib/planner/plannerImageFile';

import {
  PLANNER_IMAGE_DECODE_MAX_BYTES,
  compressPlannerImageFile,
} from './compressPlannerImageFile';

export const LOCAL_PLANNER_IMAGE_MAX_BYTES = PLANNER_IMAGE_MAX_BYTES;

type LocalPlannerImageFileError = 'size' | 'type';

export function validateLocalPlannerImageFile(
  file: File
): { ok: false; reason: LocalPlannerImageFileError } | { ok: true } {
  if (!isPlannerImageContentType(file.type)) {
    return { ok: false, reason: 'type' };
  }
  if (file.size <= 0 || file.size > LOCAL_PLANNER_IMAGE_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }
  return { ok: true };
}

/** Проверка до кропа и сжатия: тип и лимит декодирования, не финальный размер 8 МБ. */
export function acceptLocalPlannerImageForEdit(
  file: File
): { ok: false; reason: LocalPlannerImageFileError } | { ok: true } {
  if (!isPlannerImageContentType(file.type)) {
    return { ok: false, reason: 'type' };
  }
  if (file.size <= 0 || file.size > PLANNER_IMAGE_DECODE_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }
  return { ok: true };
}

export async function prepareLocalPlannerImageFile(
  file: File
): Promise<{ file: File; ok: true } | { ok: false; reason: LocalPlannerImageFileError }> {
  const accepted = acceptLocalPlannerImageForEdit(file);
  if (!accepted.ok) {
    return accepted;
  }
  const compressed = await compressPlannerImageFile(file);
  const validation = validateLocalPlannerImageFile(compressed);
  if (!validation.ok) {
    return validation;
  }
  return { file: compressed, ok: true };
}

export function createLocalPlannerImageObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeLocalPlannerImageObjectUrl(url: string | undefined): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function fileFromClipboardData(data: DataTransfer | null | undefined): File | null {
  if (!data) {
    return null;
  }
  for (const item of data.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        return file;
      }
    }
  }
  for (const file of data.files) {
    if (file.type.startsWith('image/')) {
      return file;
    }
  }
  return null;
}

export async function fileFromPlannerImageObjectUrl(url: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    if (blob.size <= 0) {
      return null;
    }
    const type = isPlannerImageContentType(blob.type) ? blob.type : 'image/jpeg';
    return new File([blob], 'photo', { type });
  } catch {
    return null;
  }
}
