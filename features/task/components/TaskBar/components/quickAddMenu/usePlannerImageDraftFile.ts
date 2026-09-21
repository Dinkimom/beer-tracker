'use client';

import type { NormalizedCropRect } from '@/features/task/utils/cropPlannerImage';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  canCropPlannerImageFile,
  cropAndCompressPlannerImageFile,
  shouldSkipPlannerImageCrop,
} from '@/features/task/utils/cropPlannerImage';
import {
  acceptLocalPlannerImageForEdit,
  createLocalPlannerImageObjectUrl,
  fileFromClipboardData,
  fileFromPlannerImageObjectUrl,
  prepareLocalPlannerImageFile,
  revokeLocalPlannerImageObjectUrl,
  validateLocalPlannerImageFile,
} from '@/features/task/utils/localPlannerImageFile';

interface CropSource {
  file: File;
  url: string;
}

function toastImageError(reason: 'size' | 'type', t: (key: string) => string): void {
  if (reason === 'type') {
    toast.error(t('sprintPlanner.swimlane.quickAddMenu.imageInvalidType'));
    return;
  }
  toast.error(t('sprintPlanner.swimlane.quickAddMenu.imageTooLarge'));
}

export function usePlannerImageDraftFile(input: {
  imageUrl?: string;
  isSubmitting: boolean;
  listenToWindowPaste: boolean;
  onImageUrlChange: (url: string | undefined) => void;
}): {
  canCropImage: boolean;
  cropSource: CropSource | null;
  isCropping: boolean;
  applyFile: (file: File | null) => void;
  handleCropApply: (rect: NormalizedCropRect) => void;
  handleCropCurrent: () => void;
  handleRemove: () => void;
  revokeCropSource: () => void;
} {
  const { t } = useI18n();
  const { imageUrl, isSubmitting, listenToWindowPaste, onImageUrlChange } = input;
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [canCropImage, setCanCropImage] = useState(false);
  const imageUrlRef = useRef(imageUrl);
  const cropSourceRef = useRef<CropSource | null>(null);
  const applyGenerationRef = useRef(0);
  const autoCropOnMountRef = useRef(Boolean(imageUrl));

  useEffect(() => {
    imageUrlRef.current = imageUrl;
  }, [imageUrl]);

  const revokeCropSource = useCallback(() => {
    revokeLocalPlannerImageObjectUrl(cropSourceRef.current?.url);
    cropSourceRef.current = null;
    setCropSource(null);
  }, []);

  useEffect(() => () => revokeLocalPlannerImageObjectUrl(cropSourceRef.current?.url), []);

  const commitPreparedFile = useCallback(
    (preparedFile: File) => {
      revokeLocalPlannerImageObjectUrl(imageUrlRef.current);
      const nextUrl = createLocalPlannerImageObjectUrl(preparedFile);
      imageUrlRef.current = nextUrl;
      setCanCropImage(canCropPlannerImageFile(preparedFile));
      onImageUrlChange(nextUrl);
    },
    [onImageUrlChange]
  );

  const openCropper = useCallback((file: File) => {
    revokeLocalPlannerImageObjectUrl(cropSourceRef.current?.url);
    const next = { file, url: createLocalPlannerImageObjectUrl(file) };
    cropSourceRef.current = next;
    setCropSource(next);
  }, []);

  const applyPreparedFile = useCallback(
    (file: File, generation: number) => {
      prepareLocalPlannerImageFile(file)
        .then((prepared) => {
          if (generation !== applyGenerationRef.current) {
            return;
          }
          if (!prepared.ok) {
            toastImageError(prepared.reason, t);
            return;
          }
          commitPreparedFile(prepared.file);
        })
        .catch(() => undefined);
    },
    [commitPreparedFile, t]
  );

  const applyFile = useCallback(
    (file: File | null) => {
      if (!file || isSubmitting || isCropping) {
        return;
      }
      const generation = ++applyGenerationRef.current;
      const accepted = acceptLocalPlannerImageForEdit(file);
      if (!accepted.ok) {
        toastImageError(accepted.reason, t);
        return;
      }
      if (shouldSkipPlannerImageCrop(file)) {
        applyPreparedFile(file, generation);
        return;
      }
      openCropper(file);
    },
    [applyPreparedFile, isCropping, isSubmitting, openCropper, t]
  );

  const handleCropApply = useCallback(
    (rect: NormalizedCropRect) => {
      const source = cropSourceRef.current;
      if (!source || isSubmitting) {
        return;
      }
      setIsCropping(true);
      cropAndCompressPlannerImageFile(source.file, rect)
        .then((cropped) => {
          const validation = validateLocalPlannerImageFile(cropped);
          if (!validation.ok) {
            toastImageError(validation.reason, t);
            return;
          }
          commitPreparedFile(cropped);
          revokeCropSource();
        })
        .catch(() => undefined)
        .finally(() => setIsCropping(false));
    },
    [commitPreparedFile, isSubmitting, revokeCropSource, t]
  );

  const handleCropCurrent = useCallback(() => {
    if (!imageUrl || isSubmitting || isCropping) {
      return;
    }
    fileFromPlannerImageObjectUrl(imageUrl)
      .then((file) => {
        if (!file || !canCropPlannerImageFile(file)) {
          return;
        }
        openCropper(file);
      })
      .catch(() => undefined);
  }, [imageUrl, isCropping, isSubmitting, openCropper]);

  const handleRemove = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    revokeLocalPlannerImageObjectUrl(imageUrlRef.current);
    imageUrlRef.current = undefined;
    setCanCropImage(false);
    onImageUrlChange(undefined);
  }, [isSubmitting, onImageUrlChange]);

  const handleWindowPaste = useCallback(
    (event: ClipboardEvent) => {
      if (cropSourceRef.current) {
        return;
      }
      const file = fileFromClipboardData(event.clipboardData);
      if (!file) {
        return;
      }
      event.preventDefault();
      applyFile(file);
    },
    [applyFile]
  );

  useEffect(() => {
    if (!listenToWindowPaste) {
      return;
    }
    document.addEventListener('paste', handleWindowPaste);
    return () => document.removeEventListener('paste', handleWindowPaste);
  }, [handleWindowPaste, listenToWindowPaste]);

  useEffect(() => {
    if (!autoCropOnMountRef.current) {
      return;
    }
    autoCropOnMountRef.current = false;
    const url = imageUrl;
    if (!url) {
      return;
    }
    let cancelled = false;
    fileFromPlannerImageObjectUrl(url)
      .then((file) => {
        if (cancelled || !file) {
          return;
        }
        const canCrop = canCropPlannerImageFile(file);
        setCanCropImage(canCrop);
        if (!canCrop) {
          return;
        }
        openCropper(file);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [imageUrl, openCropper]);

  return {
    canCropImage,
    cropSource,
    isCropping,
    applyFile,
    handleCropApply,
    handleCropCurrent,
    handleRemove,
    revokeCropSource,
  };
}
