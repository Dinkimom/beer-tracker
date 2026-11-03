/** Новогодний период оформления: 15 декабря — 15 января. */
export function isInChristmasPeriod(now: Date = new Date()): boolean {
  const month = now.getMonth();
  const day = now.getDate();
  return (month === 11 && day >= 15) || (month === 0 && day <= 15);
}
