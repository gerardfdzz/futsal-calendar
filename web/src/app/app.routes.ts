import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/team-selector/team-selector.page').then((m) => m.TeamSelectorPage),
  },
  {
    path: 'competicio/:disciplinaId',
    loadComponent: () => import('./features/team-selector/team-selector.page').then((m) => m.TeamSelectorPage),
  },
  {
    path: 'grup/:disciplinaId/:competicioId',
    loadComponent: () => import('./features/team-selector/team-selector.page').then((m) => m.TeamSelectorPage),
  },
  {
    path: 'equips/:disciplinaId/:competicioId/:grupId',
    loadComponent: () => import('./features/team-selector/team-selector.page').then((m) => m.TeamSelectorPage),
  },
  {
    path: 'equip/:groupId/:teamId',
    loadComponent: () => import('./features/team-calendar/team-calendar.page').then((m) => m.TeamCalendarPage),
  },
  { path: '**', redirectTo: '' },
];
