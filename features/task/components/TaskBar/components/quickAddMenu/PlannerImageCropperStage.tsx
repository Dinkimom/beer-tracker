'use client';

import type { NormalizedCropRect, PlannerImageCropHandle } from '@/features/task/utils/cropPlannerImage';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  applyCropInteraction,
  clientDeltaToNormalized,
  cropOverlayBands,
  displayCropFromNormalized,
  objectContainRect,
} from '@/features/task/utils/cropPlannerImage';

import {
  PLANNER_IMAGE_CROP_HANDLES,
  plannerImageCropHandleClass,
  plannerImageCropMoveClass,
} from './plannerImageCropperHandleLayout';

interface PlannerImageCropperStageProps {
  crop: NormalizedCropRect;
  imageUrl: string;
  moveAriaLabel: string;
  resizeAriaLabel: string;
  onCropChange: (crop: NormalizedCropRect) => void;
}

interface CropperViewportSize {
  height: number;
  width: number;
}

function overlayBandStyle(band: { height: number; width: number; x: number; y: number }) {
  return {
    height: band.height,
    left: band.x,
    top: band.y,
    width: band.width,
  };
}

export function PlannerImageCropperStage({
  crop,
  imageUrl,
  moveAriaLabel,
  onCropChange,
  resizeAriaLabel,
}: PlannerImageCropperStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef(crop);
  const containWidthRef = useRef(0);
  const containHeightRef = useRef(0);
  const dragRef = useRef<{ handle: PlannerImageCropHandle; x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<CropperViewportSize>({ height: 0, width: 0 });
  const [imageSize, setImageSize] = useState<CropperViewportSize>({ height: 0, width: 0 });

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      return;
    }
    const sync = () => {
      setViewport({ height: el.clientHeight, width: el.clientWidth });
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const contain = useMemo(
    () => objectContainRect(viewport.width, viewport.height, imageSize.width, imageSize.height),
    [imageSize.height, imageSize.width, viewport.height, viewport.width]
  );

  useEffect(() => {
    containWidthRef.current = contain.width;
    containHeightRef.current = contain.height;
  }, [contain.height, contain.width]);

  const displayCrop = displayCropFromNormalized(crop, contain);
  const overlayBands = cropOverlayBands(displayCrop, {
    height: viewport.height,
    width: viewport.width,
    x: 0,
    y: 0,
  });

  const updateDrag = (handle: PlannerImageCropHandle, clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    const { dx, dy } = clientDeltaToNormalized(
      clientX - drag.x,
      clientY - drag.y,
      containWidthRef.current,
      containHeightRef.current
    );
    dragRef.current = { handle, x: clientX, y: clientY };
    const nextCrop = applyCropInteraction(cropRef.current, handle, dx, dy);
    cropRef.current = nextCrop;
    onCropChange(nextCrop);
  };

  const handlePointerDown = (
    handle: PlannerImageCropHandle,
    event: ReactPointerEvent<HTMLElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { handle, x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    updateDrag(drag.handle, event.clientX, event.clientY);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[min(28rem,55vh)] min-h-[16rem] w-full touch-none overflow-hidden rounded-md bg-gray-950 select-none"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
          src={imageUrl}
          onLoad={(event) => {
            setImageSize({
              height: event.currentTarget.naturalHeight,
              width: event.currentTarget.naturalWidth,
            });
          }}
        />
      ) : null}
      {overlayBands.map((band) => (
        <div
          key={`${band.x}-${band.y}-${band.width}-${band.height}`}
          className="pointer-events-none absolute bg-black/55"
          style={overlayBandStyle(band)}
        />
      ))}
      <div
        aria-label={moveAriaLabel}
        className={`absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] ${plannerImageCropMoveClass()}`}
        style={{
          height: displayCrop.height,
          left: displayCrop.x,
          top: displayCrop.y,
          width: displayCrop.width,
        }}
        onPointerCancel={handlePointerUp}
        onPointerDown={(event) => handlePointerDown('move', event)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {PLANNER_IMAGE_CROP_HANDLES.map((handle) => (
          <button
            key={handle}
            aria-label={resizeAriaLabel}
            className={plannerImageCropHandleClass(handle)}
            type="button"
            onPointerCancel={handlePointerUp}
            onPointerDown={(event) => handlePointerDown(handle, event)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        ))}
      </div>
    </div>
  );
}
