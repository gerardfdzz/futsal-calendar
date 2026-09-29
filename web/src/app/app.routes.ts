import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/team-selector/team-selector.page').then((m) => m.TeamSelectorPage),
  },
  {
    path: 'equip/:groupId/:teamId',
    loadComponent: () => import('./features/team-calendar/team-calendar.page').then((m) => m.TeamCalendarPage),
  },
  { path: '**', redirectTo: '' },
];
