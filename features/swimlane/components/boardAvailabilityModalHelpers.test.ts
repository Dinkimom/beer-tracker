import type { BoardAvailabilityEvent } from '@/types/quarterly';

import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteBoardAvailabilityEvent } from '@/lib/beerTrackerApi';

import { confirmAndDeleteBoardAvailabilityEvent } from './boardAvailabilityModalHelpers';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/beerTrackerApi', () => ({
  createBoardAvailabilityEvent: vi.fn(),
  deleteBoardAvailabilityEvent: vi.fn(),
  updateBoardAvailabilityEvent: vi.fn(),
}));

const deleteBoardAvailabilityEventMock = vi.mocked(deleteBoardAvailabilityEvent);
const toastSuccessMock = vi.mocked(toast.success);
const toastErrorMock = vi.mocked(toast.error);

const existingEvent: BoardAvailabilityEvent = {
  endDate: '2026-09-10',
  eventType: 'vacation',
  id: 'evt-1',
  memberId: 'dev-1',
  memberName: 'Ann',
  startDate: '2026-09-08',
};

describe('confirmAndDeleteBoardAvailabilityEvent', () => {
  beforeEach(() => {
    deleteBoardAvailabilityEventMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('does not delete when confirmation is cancelled', async () => {
    const patchBoardEventsCache = vi.fn();
    const confirmWithAction = vi.fn(() => Promise.resolve(false));

    const deleted = await confirmAndDeleteBoardAvailabilityEvent({
      boardId: 7,
      confirmMessage: 'Удалить это событие?',
      confirmWithAction,
      eventId: 'evt-1',
      memberId: 'dev-1',
      patchBoardEventsCache,
    });

    expect(deleted).toBe(false);
    expect(deleteBoardAvailabilityEventMock).not.toHaveBeenCalled();
    expect(patchBoardEventsCache).not.toHaveBeenCalled();
  });

  it('deletes the event after confirmation and patches cache', async () => {
    deleteBoardAvailabilityEventMock.mockResolvedValue({ deleted: 1, success: true });
    const patchBoardEventsCache = vi.fn((patch) => {
      expect(patch([existingEvent, { ...existingEvent, id: 'evt-2' }])).toEqual([
        { ...existingEvent, id: 'evt-2' },
      ]);
    });
    const confirmWithAction = vi.fn(async (_message, onConfirmAction) => {
      await onConfirmAction();
      return true;
    });

    const deleted = await confirmAndDeleteBoardAvailabilityEvent({
      boardId: 7,
      confirmMessage: 'Удалить это событие?',
      confirmWithAction,
      eventId: 'evt-1',
      memberId: 'dev-1',
      patchBoardEventsCache,
    });

    expect(deleted).toBe(true);
    expect(deleteBoardAvailabilityEventMock).toHaveBeenCalledWith({
      boardId: 7,
      id: 'evt-1',
      memberId: 'dev-1',
    });
    expect(patchBoardEventsCache).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith('Событие удалено');
  });

  it('shows an error and rethrows when delete fails', async () => {
    const error = new Error('network');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    deleteBoardAvailabilityEventMock.mockRejectedValue(error);
    const patchBoardEventsCache = vi.fn();
    const confirmWithAction = vi.fn(async (_message, onConfirmAction) => {
      await expect(onConfirmAction()).rejects.toThrow(error);
      return false;
    });

    const deleted = await confirmAndDeleteBoardAvailabilityEvent({
      boardId: 7,
      confirmMessage: 'Удалить это событие?',
      confirmWithAction,
      eventId: 'evt-1',
      memberId: 'dev-1',
      patchBoardEventsCache,
    });

    expect(deleted).toBe(false);
    expect(patchBoardEventsCache).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Не удалось удалить событие');
    consoleError.mockRestore();
  });
});
