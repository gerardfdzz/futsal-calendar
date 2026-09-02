/**
 * Small, native `Intl`-based formatters for match kickoff times — no
 * Angular locale registration needed (that would require
 * `registerLocaleData(localeCa)` plus a `LOCALE_ID` provider just for
 * two date fields; `Intl.DateTimeFormat('ca-ES', ...)` gets the same
 * result with nothing to wire up).
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
