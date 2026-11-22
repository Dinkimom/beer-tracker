import type { TrackerMyselfUser } from '@/lib/api/types';

import { describe, expect, it } from 'vitest';

import { DEMO_DEV_ALICE } from '@/lib/demo/demoIds';

import { isOwnRetroComment, resolveRetroIdentity } from './retroIdentity';

const user = { avatarUrl: 'a.png', display: 'Ann Lee', email: 'ann@x', login: 'ann', uid: 42 } as TrackerMyselfUser;

describe('resolveRetroIdentity', () => {
  it('в демо правит фикстурный участник — реакции ставятся, хотя сессии трекера нет', () => {
    const me = resolveRetroIdentity(undefined, true);
    expect(me.actor?.userId).toBe(DEMO_DEV_ALICE);
    expect(me.author.userId).toBe(DEMO_DEV_ALICE);
  });

  it('автор заметки, комментария и реакции — один человек', () => {
    const me = resolveRetroIdentity(user, false);
    expect(me.actor).toEqual({ userId: '42', userName: 'Ann Lee' });
    expect(me.author).toEqual({ avatarUrl: 'a.png', name: 'Ann Lee', userId: '42' });
  });

  it('пока пользователь не загружен, реакцию поставить нельзя', () => {
    expect(resolveRetroIdentity(undefined, false).actor).toBeNull();
  });
});

describe('isOwnRetroComment', () => {
  const me = resolveRetroIdentity(user, false).author;
  it('по id автора, у старых комментариев без id — по имени', () => {
    expect(isOwnRetroComment({ authorId: '42' } as never, me)).toBe(true);
    expect(isOwnRetroComment({ authorId: '7' } as never, me)).toBe(false);
    expect(isOwnRetroComment({ authorName: 'Ann Lee' } as never, me)).toBe(true);
    expect(isOwnRetroComment({ authorName: 'Ann Lee' } as never, null)).toBe(false);
  });
});
