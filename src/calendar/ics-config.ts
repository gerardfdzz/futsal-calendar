export const DEFAULT_MATCH_DURATION_MINUTES = 90;

export const DEFAULT_PROD_ID = '-//futsal-calendar//FCF Sync//CA';

export const DEFAULT_UID_DOMAIN = 'partitsalcalendari.com';

export interface GenerateIcsOptions {
  readonly calendarName: string;
  readonly prodId?: string;
  readonly matchDurationMinutes?: number;
  readonly uidDomain?: string;
  readonly now?: Date;
}
