/** Классы рамки `{% block borderColor=… %}` — те же, что в прежнем markdown-рендере. */
export function trackerDescriptionBlockBorderClass(color: string): string {
  switch (color) {
    case 'warning':
    case 'orange':
    case 'yellow':
      return 'border-amber-300 bg-amber-50/70 dark:border-amber-600/60 dark:bg-amber-950/30';
    case 'danger':
    case 'red':
      return 'border-red-300 bg-red-50/70 dark:border-red-600/60 dark:bg-red-950/30';
    case 'success':
    case 'green':
      return 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-600/60 dark:bg-emerald-950/30';
    case 'normal':
    case 'gray':
      return 'border-gray-300 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-700/50';
    case 'info':
    case 'blue':
    default:
      return 'border-sky-300 bg-sky-50/70 dark:border-sky-500/50 dark:bg-sky-950/35';
  }
}
