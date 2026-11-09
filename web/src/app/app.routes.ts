import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/service-discontinued/service-discontinued.page').then((m) => m.ServiceDiscontinuedPage),
  },
  { path: '**', redirectTo: '' },
];
