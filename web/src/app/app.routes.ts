import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/team-selector/team-selector.page').then((m) => m.TeamSelectorPage),
    title: 'CatFutbol · Tria el teu equip',
  },
  {
    path: 'equip/:groupId/:teamId',
    loadComponent: () => import('./features/team-calendar/team-calendar.page').then((m) => m.TeamCalendarPage),
    title: 'CatFutbol · Calendari',
  },
  { path: '**', redirectTo: '' },
];
