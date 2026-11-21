/**
 * Кто правит доску — для журнала `board_object_events` (заметки, цели, стрелки).
 * Журнал пишут триггеры БД; автора и канал они читают из настроек текущей транзакции
 * (`beer_tracker.actor_*`, миграция 0012). Настройки живут до конца транзакции, поэтому
 * запись и `setBoardEventActor` должны идти через один `tx`.
 */

import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { runBeerTrackerTransaction } from '@/lib/db';

/** ui — человек в интерфейсе; agent — патч агента или его черновик, принятый человеком; system — служебный пересчёт. */
type BoardEventChannel = 'agent' | 'system' | 'ui';

export interface BoardEventActor {
  /** Пользователь продукта; у агента — тот, от чьего имени он работает или кто принял черновик. */
  actorId: string | null;
  channel: BoardEventChannel;
  /** Клиент агента (claude, cursor…), если известен. */
  clientBrand?: string;
}

export async function setBoardEventActor(
  tx: BeerTrackerTransactionQuery,
  actor: BoardEventActor
): Promise<void> {
  await tx(
    `SELECT set_config('beer_tracker.actor_id', $1, true),
            set_config('beer_tracker.actor_channel', $2, true),
            set_config('beer_tracker.actor_brand', $3, true)`,
    [actor.actorId ?? '', actor.channel, actor.clientBrand ?? '']
  );
}

/** Правка человека в интерфейсе (id из tenant-контекста роута). */
export function uiBoardActor(userId: string): BoardEventActor {
  return { actorId: userId, channel: 'ui' };
}

/** Запись от имени `actor` в отдельной транзакции. */
export function runAsBoardActor<T>(
  actor: BoardEventActor,
  fn: (tx: BeerTrackerTransactionQuery) => Promise<T>
): Promise<T> {
  return runBeerTrackerTransaction(async (tx) => {
    await setBoardEventActor(tx, actor);
    return fn(tx);
  });
}

/** Служебная правка (пересчёт сетки и т.п.): в журнал не попадает. */
export async function disableBoardEvents(tx: BeerTrackerTransactionQuery): Promise<void> {
  await tx(`SELECT set_config('beer_tracker.board_events', 'off', true)`);
}
