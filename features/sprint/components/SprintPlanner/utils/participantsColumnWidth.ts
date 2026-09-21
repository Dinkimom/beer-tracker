export const PARTICIPANTS_COLUMN_MIN_WIDTH = 200;
export const PARTICIPANTS_COLUMN_MAX_WIDTH = 420;

export function clampParticipantsColumnWidth(width: number): number {
  return Math.min(
    PARTICIPANTS_COLUMN_MAX_WIDTH,
    Math.max(PARTICIPANTS_COLUMN_MIN_WIDTH, width)
  );
}
