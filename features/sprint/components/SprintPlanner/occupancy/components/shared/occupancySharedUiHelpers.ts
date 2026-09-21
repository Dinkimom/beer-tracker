export function occupancyPhaseDividerBgClass(args: {
  devBlueColors: { border: string; borderDark?: string };
  discoveryYellowColors: { border: string; borderDark?: string };
  forceDevColor: boolean;
  forceDiscoveryColor: boolean;
  getPhaseDividerClasses: (status: string, isQa: boolean) => string;
  isQa: boolean;
  statusForColors: string;
}): string {
  if (args.forceDiscoveryColor) {
    return `${args.discoveryYellowColors.border} ${args.discoveryYellowColors.borderDark ?? ''}`.trim();
  }
  if (args.forceDevColor) {
    return `${args.devBlueColors.border} ${args.devBlueColors.borderDark ?? ''}`.trim();
  }
  return args.getPhaseDividerClasses(args.statusForColors, args.isQa);
}
