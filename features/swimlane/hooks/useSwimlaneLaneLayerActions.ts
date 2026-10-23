import type { SwimlaneCardLayerWrite } from '@/lib/swimlane/swimlaneCardLayers';
import type { TaskPosition } from '@/types';

import { useCallback } from 'react';

import { parsePlanPatchPreviewElementId } from '@/features/swimlane/utils/planPatchPreviewFocus';
import {
  collectSwimlaneArrangeWrites,
  collectSwimlaneAutoLayerWrites,
  resolveRegisteredSwimlaneCardDrop,
} from '@/features/swimlane/utils/swimlaneLaneLayoutRegistry';
import { useSwimlaneAutoArrangeStorage } from '@/hooks/useLocalStorage';
import { useRootStore } from '@/lib/layers';

/** Ручная раскладка строк свимлейна (автосортировка выключена): слой после дропа, фиксация раскладки. */
export function useSwimlaneLaneLayerActions() {
  const { taskPositions } = useRootStore();
  const [autoArrange] = useSwimlaneAutoArrangeStorage();

  const writeManualLayers = useCallback(
    (writes: readonly SwimlaneCardLayerWrite[]) => {
      const laneLayers = taskPositions.laneLayers;
      const written = new Set(writes.map(({ cardId }) => cardId));
      // Первая ручная правка фиксирует остальные карточки там, где они стоят сейчас.
      const frozen = collectSwimlaneAutoLayerWrites(laneLayers.layers).filter(
        ({ cardId }) => !written.has(cardId)
      );
      laneLayers.set([...frozen, ...writes], { recordHistory: true });
    },
    [taskPositions]
  );

  const handleLaneLayerDrop = useCallback(
    (input: { position: TaskPosition; targetTopLayer: number; taskId: string }) => {
      // Автосортировка сама раскладывает строку: ручной слой не пишем.
      if (autoArrange || parsePlanPatchPreviewElementId(input.taskId)) {
        return;
      }
      const { writes } = resolveRegisteredSwimlaneCardDrop({
        cardId: input.taskId,
        laneId: input.position.assignee,
        position: input.position,
        targetTopLayer: input.targetTopLayer,
      });
      // Сама карточка — последней: её правка самая свежая.
      const card = writes.filter(({ cardId }) => cardId === input.taskId);
      writeManualLayers([...writes.filter(({ cardId }) => cardId !== input.taskId), ...card]);
    },
    [autoArrange, writeManualLayers]
  );

  /** Выключение автосортировки: текущая раскладка становится ручной (без шага истории). */
  const freezeSwimlaneLayout = useCallback(() => {
    taskPositions.laneLayers.set(collectSwimlaneArrangeWrites());
  }, [taskPositions]);

  return { freezeSwimlaneLayout, handleLaneLayerDrop };
}
