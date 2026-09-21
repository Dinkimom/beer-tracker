'use client';

import type { Developer } from '@/types';

import Image from 'next/image';

import { TEAM_TAG_BG, TEAM_TAG_BORDER } from '@/utils/teamColors';

const SIZE_CLASSES = {
  /** 16px — исполнитель в подвале карточки «по фичам» */
  '2xs': 'h-4 w-4 min-h-4 min-w-4 shrink-0 aspect-square text-[8px]',
  /** 22px — иконка комментария на таймлайне занятости */
  xs: 'h-[22px] w-[22px] min-h-[22px] min-w-[22px] shrink-0 aspect-square text-[10px]',
  /** 24px — узкая фаза в плане занятости */
  sm: 'h-6 w-6 min-h-6 min-w-6 shrink-0 aspect-square text-[9px]',
  /** 28px — пикер исполнителя, фаза в плане занятости */
  md: 'h-7 w-7 min-h-7 min-w-7 shrink-0 aspect-square text-xs',
  /** 32px — заголовок разработчика, тултипы */
  lg: 'h-8 w-8 min-h-8 min-w-8 shrink-0 aspect-square text-xs',
} as const;

const AVATAR_PIXEL_SIZE: Record<keyof typeof SIZE_CLASSES, number> = {
  '2xs': 16,
  xs: 22,
  sm: 24,
  md: 28,
  lg: 32,
};

/** Единый бордер для фото и инициалов (совпадает с baseImageClasses) */
const AVATAR_BORDER = 'border border-gray-400 dark:border-white';

const teamVariant = (team: string) =>
  `${TEAM_TAG_BG[team]} text-white border ${TEAM_TAG_BORDER[team]}`;

const INITIALS_VARIANT_CLASSES = {
  /** Серый фон (списки, заголовки разработчиков, тултипы переходов) */
  default: `bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 ${AVATAR_BORDER}`,
  /** Синий градиент (комментарии, автор) */
  primary: `bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 text-white ${AVATAR_BORDER} font-bold`,
  /** Цвета команд из teamColors.ts */
  qa: teamVariant('QA'),
  back: teamVariant('Back'),
  web: teamVariant('Web'),
  devops: teamVariant('DevOps'),
} as const;

type AvatarSize = keyof typeof SIZE_CLASSES;
export type AvatarInitialsVariant = keyof typeof INITIALS_VARIANT_CLASSES;

/** Возвращает вариант аватара по данным разработчика */
export function getAvatarVariantForDeveloper(dev: Pick<Developer, 'platforms' | 'role'>): AvatarInitialsVariant {
  if (dev.role === 'tester') return 'qa';
  if (dev.platforms?.includes('back')) return 'back';
  if (dev.platforms?.includes('web')) return 'web';
  return 'default';
}

const TEAM_TO_VARIANT: Record<string, AvatarInitialsVariant> = {
  QA: 'qa',
  Back: 'back',
  Web: 'web',
  DevOps: 'devops',
};

/**
 * Возвращает вариант аватара по команде задачи — используется как запасной вариант,
 * когда конкретный исполнитель неизвестен.
 */
export function getAvatarVariantForTeam(team: string | null | undefined): AvatarInitialsVariant {
  return TEAM_TO_VARIANT[team ?? ''] ?? 'default';
}

interface AvatarProps {
  /** URL фото; при отсутствии показываются инициалы */
  avatarUrl?: string | null;
  className?: string;
  /** Инициалы (1–2 символа), используются при отсутствии avatarUrl */
  initials: string;
  /** Доп. классы для контейнера инициалов (например, badge из getTeamTagClasses) */
  initialsClassName?: string;
  /** Вариант фона для инициалов (игнорируется при наличии avatarUrl) */
  initialsVariant?: AvatarInitialsVariant;
  size?: AvatarSize;
  style?: React.CSSProperties;
  title?: string;
}

export function Avatar({
  avatarUrl,
  initials,
  size = 'lg',
  initialsVariant = 'default',
  initialsClassName,
  className = '',
  style,
  title,
}: AvatarProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const pixelSize = AVATAR_PIXEL_SIZE[size];
  const baseImageClasses = `rounded-full object-cover ${AVATAR_BORDER}`;
  const baseInitialsClasses = 'rounded-full flex items-center justify-center font-semibold';
  /** minWidth бьёт abspos shrink-to-fit (колбасы занятости с left:50%) — иначе круг сжимается в овал */
  const sizeStyle: React.CSSProperties = {
    width: pixelSize,
    height: pixelSize,
    minWidth: pixelSize,
    minHeight: pixelSize,
    ...style,
  };

  if (avatarUrl) {
    return (
      <Image
        alt=""
        className={`${baseImageClasses} ${sizeClasses} ${className}`.trim()}
        height={pixelSize}
        src={avatarUrl}
        style={sizeStyle}
        title={title}
        unoptimized
        width={pixelSize}
      />
    );
  }

  const variantClasses = initialsClassName ?? INITIALS_VARIANT_CLASSES[initialsVariant];
  return (
    <span
      className={`${baseInitialsClasses} ${sizeClasses} ${variantClasses} ${className}`.trim()}
      style={sizeStyle}
      title={title}
    >
      {initials}
    </span>
  );
}
