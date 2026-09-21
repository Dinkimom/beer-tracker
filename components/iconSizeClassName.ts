export function iconSizeClassName(size: 'lg' | 'md' | 'sm' | undefined): string {
  if (size === 'sm') {
    return 'w-4 h-4';
  }
  if (size === 'lg') {
    return 'w-6 h-6';
  }
  return 'w-5 h-5';
}
