/** Класс `.fact-timeline-marker-opacity` — исключение из глобального сброса transitions в globals.css */
export function swimlaneFactMarkerOpacityClass(
  isFactHovered: boolean,
  isDimmedByFactHover: boolean
): string {
  const base = 'fact-timeline-marker-opacity';
  if (isDimmedByFactHover && !isFactHovered) {
    return `${base} opacity-40`;
  }
  return `${base} opacity-100`;
}
