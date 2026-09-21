import {
  bitmapFromPlannerImageFile,
  blobFromCanvas,
  compressPlannerImageFile,
  fileNameForPlannerImageType,
  PLANNER_IMAGE_COMPRESS_QUALITY,
  plannerImageOutputType,
  scaledPlannerImageSize,
  shouldSkipPlannerImageCompression,
} from './compressPlannerImageFile';

const PLANNER_IMAGE_CROPPER_ROOT_SELECTOR = '[data-planner-image-cropper]';

export const FULL_NORMALIZED_CROP_RECT: NormalizedCropRect = {
  height: 1,
  width: 1,
  x: 0,
  y: 0,
};

const MIN_NORMALIZED_CROP_SIZE = 0.05;
const FULL_CROP_EPSILON = 0.001;

export interface NormalizedCropRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export type PlannerImageCropHandle =
  | 'e'
  | 'move'
  | 'n'
  | 'ne'
  | 'nw'
  | 's'
  | 'se'
  | 'sw'
  | 'w';

interface PixelBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function shouldSkipPlannerImageCrop(file: File): boolean {
  return shouldSkipPlannerImageCompression(file);
}

export function canCropPlannerImageFile(file: File): boolean {
  return !shouldSkipPlannerImageCrop(file);
}

export function isPlannerImageCropperOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector(PLANNER_IMAGE_CROPPER_ROOT_SELECTOR) != null;
}

export function isFullNormalizedCropRect(rect: NormalizedCropRect): boolean {
  return (
    rect.x <= FULL_CROP_EPSILON &&
    rect.y <= FULL_CROP_EPSILON &&
    rect.width >= 1 - FULL_CROP_EPSILON &&
    rect.height >= 1 - FULL_CROP_EPSILON
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundNormalized(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function clampNormalizedCropRect(
  rect: NormalizedCropRect,
  minSize = MIN_NORMALIZED_CROP_SIZE
): NormalizedCropRect {
  const width = clamp(roundNormalized(rect.width), minSize, 1);
  const height = clamp(roundNormalized(rect.height), minSize, 1);
  return {
    height,
    width,
    x: clamp(roundNormalized(rect.x), 0, 1 - width),
    y: clamp(roundNormalized(rect.y), 0, 1 - height),
  };
}

export function applyCropInteraction(
  rect: NormalizedCropRect,
  handle: PlannerImageCropHandle,
  dx: number,
  dy: number
): NormalizedCropRect {
  if (handle === 'move') {
    return clampNormalizedCropRect({
      height: rect.height,
      width: rect.width,
      x: rect.x + dx,
      y: rect.y + dy,
    });
  }
  let { height, width, x, y } = rect;
  if (handle === 'e' || handle === 'ne' || handle === 'se') {
    width += dx;
  }
  if (handle === 'nw' || handle === 'sw' || handle === 'w') {
    x += dx;
    width -= dx;
  }
  if (handle === 's' || handle === 'se' || handle === 'sw') {
    height += dy;
  }
  if (handle === 'n' || handle === 'ne' || handle === 'nw') {
    y += dy;
    height -= dy;
  }
  return clampNormalizedCropRect({ height, width, x, y });
}

export function objectContainRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): PixelBox {
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { height: 0, width: 0, x: 0, y: 0 };
  }
  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    height,
    width,
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
  };
}

export function displayCropFromNormalized(rect: NormalizedCropRect, contain: PixelBox): PixelBox {
  return {
    height: rect.height * contain.height,
    width: rect.width * contain.width,
    x: contain.x + rect.x * contain.width,
    y: contain.y + rect.y * contain.height,
  };
}

export function clientDeltaToNormalized(
  deltaX: number,
  deltaY: number,
  containWidth: number,
  containHeight: number
): { dx: number; dy: number } {
  return {
    dx: containWidth === 0 ? 0 : deltaX / containWidth,
    dy: containHeight === 0 ? 0 : deltaY / containHeight,
  };
}

export function cropOverlayBands(crop: PixelBox, container: PixelBox): PixelBox[] {
  return [
    { height: crop.y, width: container.width, x: 0, y: 0 },
    {
      height: Math.max(0, container.height - crop.y - crop.height),
      width: container.width,
      x: 0,
      y: crop.y + crop.height,
    },
    { height: crop.height, width: crop.x, x: 0, y: crop.y },
    {
      height: crop.height,
      width: Math.max(0, container.width - crop.x - crop.width),
      x: crop.x + crop.width,
      y: crop.y,
    },
  ].filter((band) => band.width > 0.5 && band.height > 0.5);
}

export function pixelCropFromNormalized(
  rect: NormalizedCropRect,
  imageWidth: number,
  imageHeight: number
): { height: number; sx: number; sy: number; width: number } {
  const sx = clamp(Math.round(rect.x * imageWidth), 0, Math.max(0, imageWidth - 1));
  const sy = clamp(Math.round(rect.y * imageHeight), 0, Math.max(0, imageHeight - 1));
  const width = Math.max(1, Math.min(imageWidth - sx, Math.round(rect.width * imageWidth)));
  const height = Math.max(1, Math.min(imageHeight - sy, Math.round(rect.height * imageHeight)));
  return { height, sx, sy, width };
}

function fileFromCroppedBlob(original: File, blob: Blob): File {
  const type = blob.type || plannerImageOutputType(original.type);
  return new File([blob], fileNameForPlannerImageType(original.name, type), {
    lastModified: Date.now(),
    type,
  });
}

/** Обрезает фото и сжимает так же, как обычная загрузка. GIF не трогает. */
export async function cropAndCompressPlannerImageFile(
  file: File,
  rect: NormalizedCropRect
): Promise<File> {
  if (shouldSkipPlannerImageCrop(file) || isFullNormalizedCropRect(rect)) {
    return compressPlannerImageFile(file);
  }
  const bitmap = await bitmapFromPlannerImageFile(file);
  if (!bitmap) {
    return compressPlannerImageFile(file);
  }
  try {
    const source = pixelCropFromNormalized(rect, bitmap.width, bitmap.height);
    const { height, width } = scaledPlannerImageSize(source.width, source.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return compressPlannerImageFile(file);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      source.sx,
      source.sy,
      source.width,
      source.height,
      0,
      0,
      width,
      height
    );
    const cropped = await blobFromCanvas(
      canvas,
      plannerImageOutputType(file.type),
      PLANNER_IMAGE_COMPRESS_QUALITY
    );
    if (!cropped || cropped.size <= 0) {
      return compressPlannerImageFile(file);
    }
    return fileFromCroppedBlob(file, cropped);
  } finally {
    bitmap.close();
  }
}
