export const PLANNER_IMAGE_COMPRESS_MAX_EDGE = 1920;
export const PLANNER_IMAGE_DECODE_MAX_BYTES = 40 * 1024 * 1024;

export const PLANNER_IMAGE_COMPRESS_QUALITY = 0.82;

type PlannerImageOutputType = 'image/jpeg' | 'image/webp';

export function scaledPlannerImageSize(
  width: number,
  height: number,
  maxEdge: number = PLANNER_IMAGE_COMPRESS_MAX_EDGE
): { height: number; width: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { height, width };
  }
  const scale = maxEdge / longest;
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

export function shouldSkipPlannerImageCompression(file: File): boolean {
  return file.type === 'image/gif';
}

export function plannerImageOutputType(inputType: string): PlannerImageOutputType {
  if (inputType === 'image/png' || inputType === 'image/webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
}

export function fileNameForPlannerImageType(name: string, type: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'photo';
  if (type === 'image/webp') {
    return `${base}.webp`;
  }
  if (type === 'image/jpeg') {
    return `${base}.jpg`;
  }
  return name;
}

export function pickCompressedPlannerImage(original: File, compressed: Blob | null): File {
  if (!compressed || compressed.size <= 0 || compressed.size >= original.size) {
    return original;
  }
  return new File([compressed], fileNameForPlannerImageType(original.name, compressed.type), {
    lastModified: Date.now(),
    type: compressed.type,
  });
}

export async function blobFromCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
  if (blob || type === 'image/jpeg') {
    return blob;
  }
  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

export async function bitmapFromPlannerImageFile(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== 'function') {
    return null;
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Safari/jsdom may reject the orientation option; retry without it.
  }
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

/** Сжимает фотокарточки перед превью и загрузкой: без отдельного npm-пакета, canvas в браузере. */
export async function compressPlannerImageFile(file: File): Promise<File> {
  if (shouldSkipPlannerImageCompression(file)) {
    return file;
  }
  const bitmap = await bitmapFromPlannerImageFile(file);
  if (!bitmap) {
    return file;
  }
  try {
    const { height, width } = scaledPlannerImageSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    const compressed = await blobFromCanvas(
      canvas,
      plannerImageOutputType(file.type),
      PLANNER_IMAGE_COMPRESS_QUALITY
    );
    return pickCompressedPlannerImage(file, compressed);
  } finally {
    bitmap.close();
  }
}
