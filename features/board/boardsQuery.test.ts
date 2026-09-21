import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardsQueryKey, invalidateBoardsQuery } from './boardsQuery';

describe('boardsQuery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invalidateBoardsQuery invalidates boards with refetchType all', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    await invalidateBoardsQuery(queryClient);

    expect(spy).toHaveBeenCalledWith({
      queryKey: boardsQueryKey,
      refetchType: 'all',
    });
  });
});
