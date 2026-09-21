/** ISO Date → CalDAV UTC, напр. 20260717T120000Z */
export function dateToCalDavUtcString(date: Date): string {
  return date.toISOString().replace(/-/g, '').replace(/:/g, '').replace(/\.\d{3}Z$/, 'Z');
}
