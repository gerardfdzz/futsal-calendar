const dayMonthFormatter = new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('ca-ES', { hour: '2-digit', minute: '2-digit' });

export function formatMatchDay(date: Date): string {
  return dayMonthFormatter.format(date);
}

export function formatMatchTime(date: Date): string {
  return timeFormatter.format(date);
}
