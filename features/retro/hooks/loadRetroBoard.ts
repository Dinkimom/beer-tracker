import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';
import { fetchRetroBoard, saveRetroBoard } from '@/lib/api/sprints';
import { parseRetroStore, type RetroBoard } from '@/lib/retro/retroBoard';

function readLocalStore(): ReturnType<typeof parseRetroStore> | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.RETRO_BOARDS);
  if (!raw) return null;
  try {
    return parseRetroStore(JSON.parse(raw));
  } catch {
    return null;
  }
}

function forgetLocalRetroBoard(sprintId: number): void {
  const store = readLocalStore();
  if (!store?.boards[String(sprintId)]) return;
  delete store.boards[String(sprintId)];
  window.localStorage.setItem(STORAGE_KEYS.RETRO_BOARDS, JSON.stringify(store));
}

export async function loadRetroBoard(sprintId: number): Promise<RetroBoard | null> {
  const remote = await fetchRetroBoard(sprintId);
  if (remote) return remote;
  const local = readLocalStore()?.boards[String(sprintId)] ?? null;
  if (!local) return null;
  await saveRetroBoard(sprintId, local, null);
  forgetLocalRetroBoard(sprintId);
  return local;
}
