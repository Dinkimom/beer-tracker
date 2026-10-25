import { describe, expect, it } from 'vitest';

import { createCommentSaveSerializer } from './commentSaveSerializer';

describe('createCommentSaveSerializer', () => {
  it('sends the next own save from the version our previous save produced', () => {
    const serializer = createCommentSaveSerializer();
    serializer.recordSaved('n1', 5, 6);
    serializer.recordSaved('n1', 6, 7);
    expect(serializer.resolveIfVersion('n1', 5)).toBe(7);
    expect(serializer.resolveIfVersion('n1', 7)).toBe(7);
  });

  it('keeps a version the server moved without us, so a concurrent edit conflicts', () => {
    const serializer = createCommentSaveSerializer();
    serializer.recordSaved('n1', 5, 6);
    expect(serializer.resolveIfVersion('n1', 8)).toBe(8);
    expect(serializer.resolveIfVersion('n2', 5)).toBe(5);
    expect(serializer.resolveIfVersion('n1', undefined)).toBeUndefined();
  });

  it('runs saves of one note one after another, other notes in parallel', async () => {
    const serializer = createCommentSaveSerializer();
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const first = serializer.run('n1', () => new Promise<void>((resolve) => {
      releaseFirst = () => {
        order.push('n1:first');
        resolve();
      };
    }));
    const second = serializer.run('n1', () => {
      order.push('n1:second');
      return Promise.resolve();
    });
    await serializer.run('n2', () => {
      order.push('n2');
      return Promise.resolve();
    });
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['n2', 'n1:first', 'n1:second']);
  });

  it('keeps the queue going after a failed save', async () => {
    const serializer = createCommentSaveSerializer();
    const failed = serializer.run('n1', () => Promise.reject(new Error('409')));
    await expect(failed).rejects.toThrow('409');
    await expect(serializer.run('n1', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});
