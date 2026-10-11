import type { BoardAvailabilityEvent } from '@/types/quarterly';

import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteBoardAvailabilityEvent } from '@/lib/beerTrackerApi';

import { deleteBoardAvailabilityEventAndPatchCache } from './boardAvailabilityModalHelpers';

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

describe('deleteBoardAvailabilityEventAndPatchCache', () => {
  beforeEach(() => {
    deleteBoardAvailabilityEventMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('deletes the event and patches cache', async () => {
    deleteBoardAvailabilityEventMock.mockResolvedValue({ deleted: 1, success: true });
    const patchBoardEventsCache = vi.fn((patch) => {
      expect(patch([existingEvent, { ...existingEvent, id: 'evt-2' }])).toEqual([
        { ...existingEvent, id: 'evt-2' },
      ]);
    });

    await deleteBoardAvailabilityEventAndPatchCache({
      boardId: 7,
      eventId: 'evt-1',
      memberId: 'dev-1',
      patchBoardEventsCache,
    });

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

    await expect(
      deleteBoardAvailabilityEventAndPatchCache({
        boardId: 7,
        eventId: 'evt-1',
        memberId: 'dev-1',
        patchBoardEventsCache,
      })
    ).rejects.toThrow(error);

    expect(patchBoardEventsCache).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith('Не удалось удалить событие');
    consoleError.mockRestore();
  });
});
