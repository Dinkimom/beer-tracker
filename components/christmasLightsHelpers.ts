interface ChristmasLight {
  color: string;
  delay: number;
  id: string;
  isOn: boolean;
  verticalOffset: number;
}

export function randomizeChristmasLightState(light: ChristmasLight): ChristmasLight {
  return {
    ...light,
    isOn: Math.random() > 0.25,
  };
}

export function getChristmasBulbShellColor(theme: string) {
  return theme === 'dark' ? '#166534' : '#16a34a';
}

export function getChristmasBulbStyles(light: Pick<ChristmasLight, 'color' | 'isOn'>) {
  return {
    filter: light.isOn ? `drop-shadow(0 0 5px ${light.color}) drop-shadow(0 0 9px ${light.color})` : 'none',
    opacity: light.isOn ? 1 : 0.3,
    boxShadow: light.isOn
      ? `0 0 9px ${light.color}, 0 0 14px ${light.color}, inset -2px 2px 4px rgba(255,255,255,0.6), inset 2px -2px 4px rgba(0,0,0,0.15)`
      : 'inset 0 2px 5px rgba(0, 0, 0, 0.215)',
    highlightOpacity: light.isOn ? 1 : 0.2,
  };
}
