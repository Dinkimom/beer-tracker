/**
 * Сохранения одной заметки идут по очереди, а версия для `ifVersion` учитывает собственные
 * успешные сохранения: наше v5→v6 не должно давать конфликт следующей своей правке, даже если
 * локальная копия ещё со старой версией. Чужая правка (сервер ушёл вперёд без нас) — конфликт.
 */
export interface CommentSaveSerializer {
  /** Наше сохранение перевело заметку из `fromVersion` в `toVersion`. */
  recordSaved(commentId: string, fromVersion: number | undefined, toVersion: number | undefined): void;
  /** Версия, с которой отправлять правку: продвигает `version` по цепочке своих сохранений. */
  resolveIfVersion(commentId: string, version: number | undefined): number | undefined;
  /** Задача сохранения заметки — строго после предыдущей задачи этой же заметки. */
  run<T>(commentId: string, task: () => Promise<T>): Promise<T>;
}

export function createCommentSaveSerializer(): CommentSaveSerializer {
  const ownBumps = new Map<string, Map<number, number>>();
  const queues = new Map<string, Promise<unknown>>();

  return {
    resolveIfVersion(commentId, version) {
      const bumps = ownBumps.get(commentId);
      let current = version;
      const seen = new Set<number>();
      while (current != null && bumps?.has(current) && !seen.has(current)) {
        seen.add(current);
        current = bumps.get(current);
      }
      return current;
    },
    recordSaved(commentId, fromVersion, toVersion) {
      if (fromVersion == null || toVersion == null || toVersion === fromVersion) return;
      const bumps = ownBumps.get(commentId) ?? new Map<number, number>();
      bumps.set(fromVersion, toVersion);
      ownBumps.set(commentId, bumps);
    },
    run(commentId, task) {
      const previous = queues.get(commentId) ?? Promise.resolve();
      const next = previous.catch(() => undefined).then(task);
      queues.set(commentId, next);
      next
        .finally(() => {
          if (queues.get(commentId) === next) queues.delete(commentId);
        })
        .catch(() => undefined);
      return next;
    },
  };
}
