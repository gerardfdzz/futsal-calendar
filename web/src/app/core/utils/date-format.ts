/**
 * Native `Intl`-based formatters for match kickoff times — avoids the
 * Angular locale registration (`registerLocaleData` + `LOCALE_ID`) that
 * would otherwise be needed just for two date fields.
 */
const dayMonthFormatter = new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('ca-ES', { hour: '2-digit', minute: '2-digit' });

/** e.g. "26 set." */
export function formatMatchDay(date: Date): string {
  return dayMonthFormatter.format(date);
}

/** e.g. "18:30" */
export function formatMatchTime(date: Date): string {
  return timeFormatter.format(date);
}
