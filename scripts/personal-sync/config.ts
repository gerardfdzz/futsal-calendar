export interface PersonalSyncSubscription {
  readonly groupId: string;
  readonly teamId: string;
  readonly label: string;
}

export const SUBSCRIPTIONS: readonly PersonalSyncSubscription[] = [
  { groupId: '58162580', teamId: '54755993', label: 'Lliga' },
  { groupId: '60090763', teamId: '54755993', label: 'Fase 2' },
  { groupId: '60856084', teamId: '54755993', label: 'Copa Tarragona' },
];

export const GOOGLE_CALENDAR_SUMMARY = 'CFS LA SÉNIA — Partits';
