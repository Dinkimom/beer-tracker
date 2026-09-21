export const PLANNER_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const PLANNER_IMAGE_CONTENT_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

type PlannerImageContentType = (typeof PLANNER_IMAGE_CONTENT_TYPES)[number];

type PlannerImageFileError = 'size' | 'type';

const PLANNER_IMAGE_CONTENT_TYPE_SET = new Set<string>(PLANNER_IMAGE_CONTENT_TYPES);

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function isGif(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return riff && webp;
}

export function isPlannerImageContentType(value: string): value is PlannerImageContentType {
  return PLANNER_IMAGE_CONTENT_TYPE_SET.has(value);
}

function sniffPlannerImageContentType(bytes: Uint8Array): PlannerImageContentType | null {
  if (isJpeg(bytes)) {
    return 'image/jpeg';
  }
  if (isPng(bytes)) {
    return 'image/png';
  }
  if (isGif(bytes)) {
    return 'image/gif';
  }
  if (isWebp(bytes)) {
    return 'image/webp';
  }
  return null;
}

export function validatePlannerImageBytes(
  bytes: Uint8Array,
  declaredType?: string
): { contentType: PlannerImageContentType; ok: true } | { ok: false; reason: PlannerImageFileError } {
  if (bytes.length <= 0 || bytes.length > PLANNER_IMAGE_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }
  const sniffed = sniffPlannerImageContentType(bytes);
  if (!sniffed) {
    return { ok: false, reason: 'type' };
  }
  if (declaredType && declaredType !== sniffed && !isCompatibleDeclaredImageType(declaredType, sniffed)) {
    return { ok: false, reason: 'type' };
  }
  return { contentType: sniffed, ok: true };
}

function isCompatibleDeclaredImageType(
  declaredType: string,
  sniffed: PlannerImageContentType
): boolean {
  if (declaredType === sniffed) {
    return true;
  }
  return declaredType === 'image/jpg' && sniffed === 'image/jpeg';
}
