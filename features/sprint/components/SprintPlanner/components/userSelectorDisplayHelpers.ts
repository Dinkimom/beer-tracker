import type { RegistryUserItem } from '@/lib/beerTrackerApi';

export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase() || '?';
}

export function getUserSelectorInitials(displayName: string): string {
  return getInitials(displayName);
}

export function getUserSelectorButtonText(params: {
  loadingLabel: string;
  loadingUser: boolean;
  placeholder: string;
  selectedUser: RegistryUserItem | null;
  value: string;
}): string {
  if (params.loadingUser) return params.loadingLabel;
  return params.selectedUser?.displayName || params.value || params.placeholder;
}
