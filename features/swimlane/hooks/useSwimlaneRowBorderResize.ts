import { useEffect, useRef, useState } from 'react';

import {
  pointerYToSwimlaneReservedTaskLayers,
} from '@/features/swimlane/utils/swimlaneRowReservedLayers';

interface UseSwimlaneRowBorderResizeInput {
  bandElementRef: React.RefObject<HTMLElement | null>;
  contentMaxTaskLayers: number;
  oneCardHeightPx: number;
  reservedTaskLayers?: number;
  onPreviewLayersChange?: (layers: number | null) => void;
  onReservedTaskLayersCommit: (layers: number | null) => void;
}

export function useSwimlaneRowBorderResize({
  bandElementRef,
  contentMaxTaskLayers,
  oneCardHeightPx,
  onPreviewLayersChange,
  onReservedTaskLayersCommit,
  reservedTaskLayers,
}: UseSwimlaneRowBorderResizeInput) {
  const [previewLayers, setPreviewLayers] = useState<number | null>(null);
  const previewLayersRef = useRef<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) {
      return;
    }
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.body.dataset.swimlaneRowResizing = 'true';
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      delete document.body.dataset.swimlaneRowResizing;
    };
  }, [isResizing]);

  const handleResizeStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    const bandElement = bandElementRef.current;
    if (!bandElement) {
      return;
    }

    setIsResizing(true);

    // Фиксируем top на mousedown: при росте полосы getBoundingClientRect().height увеличивается
    // и нижняя граница «уезжает» за курсор — без якоря ресайз застревает на текущей высоте.
    const startBandTopPx = bandElement.getBoundingClientRect().top;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const layers = pointerYToSwimlaneReservedTaskLayers({
        contentMinTaskLayers: contentMaxTaskLayers,
        oneCardHeightPx,
        pointerYInBandPx: moveEvent.clientY - startBandTopPx,
      });
      previewLayersRef.current = layers;
      setPreviewLayers(layers);
      onPreviewLayersChange?.(layers);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsResizing(false);
      const committedLayers = previewLayersRef.current;
      previewLayersRef.current = null;
      if (committedLayers == null) {
        setPreviewLayers(null);
        onPreviewLayersChange?.(null);
        return;
      }
      const toStore =
        committedLayers > contentMaxTaskLayers ? committedLayers : null;
      onReservedTaskLayersCommit(toStore);
      if (toStore != null) {
        setPreviewLayers(toStore);
        onPreviewLayersChange?.(toStore);
        return;
      }
      setPreviewLayers(contentMaxTaskLayers);
      onPreviewLayersChange?.(contentMaxTaskLayers);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const effectiveReservedLayers = Math.max(
    contentMaxTaskLayers,
    previewLayers ?? reservedTaskLayers ?? contentMaxTaskLayers
  );

  return {
    effectiveReservedLayers,
    handleResizeStart,
    isResizing,
    previewLayers,
  };
}
