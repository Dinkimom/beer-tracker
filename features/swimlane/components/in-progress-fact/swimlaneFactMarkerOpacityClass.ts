/** Класс `.fact-timeline-marker-opacity` — исключение из глобального сброса transitions в globals.css */
export function swimlaneFactMarkerOpacityClass(
  isFactHovered: boolean,
  isDimmedByFactHover: boolean
): string {
  const base = 'fact-timeline-marker-opacity';
  if (isFactHovered) {
    return `${base} opacity-100`;
  }
  if (isDimmedByFactHover) {
    return `${base} opacity-35`;
  }
  return `${base} opacity-60 hover:opacity-100`;
}
