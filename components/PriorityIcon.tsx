'use client';

import { Icon } from './Icon';

interface PriorityIconProps {
  className?: string;
  priority?: string;
}

interface PriorityConfig {
  aliases: string[];
  color: string;
  iconName: string;
  title: string;
}

const PRIORITY_CONFIGS: PriorityConfig[] = [
  {
    aliases: ['blocker', 'p1'],
    color: 'text-red-600 dark:text-red-400',
    iconName: 'priority-blocker',
    title: 'Blocker',
  },
  {
    aliases: ['critical', 'urgent', 'high', 'major', 'p2'],
    color: 'text-orange-600 dark:text-orange-400',
    iconName: 'priority-critical',
    title: 'Critical',
  },
  {
    aliases: ['medium', 'normal', 'p3', 'не указан'],
    color: 'text-gray-600 dark:text-gray-300',
    iconName: 'priority-medium',
    title: 'Medium',
  },
  {
    aliases: ['low', 'minor', 'p4'],
    color: 'text-gray-500 dark:text-gray-400',
    iconName: 'priority-low',
    title: 'Low',
  },
  {
    aliases: ['trivial', 'p5'],
    color: 'text-gray-500 dark:text-gray-400',
    iconName: 'priority-trivial',
    title: 'Trivial',
  },
];

function resolvePriorityConfig(priority: string): Omit<PriorityConfig, 'aliases'> {
  const normalizedPriority = priority.toLowerCase();
  const matched = PRIORITY_CONFIGS.find((config) => config.aliases.includes(normalizedPriority));
  if (matched) {
    const { aliases: _aliases, ...config } = matched;
    return config;
  }
  return {
    iconName: 'priority-medium',
    color: 'text-gray-500 dark:text-gray-400',
    title: priority,
  };
}

function iconSizeFromClassName(className: string): string {
  if (className.includes('w-3') || className.includes('h-3')) {
    return 'w-4 h-4';
  }
  return 'w-5 h-5';
}

/**
 * Компонент для отображения иконки приоритета задачи
 */
export function PriorityIcon({ priority, className = '' }: PriorityIconProps) {
  if (!priority) return null;

  const config = resolvePriorityConfig(priority);
  const iconSize = iconSizeFromClassName(className);

  return (
    <span
      aria-label={`Приоритет: ${config.title}`}
      className={`inline-flex items-center justify-center ${config.color} ${className}`}
      title={config.title}
    >
      <Icon
        className={iconSize}
        name={config.iconName}
      />
    </span>
  );
}

