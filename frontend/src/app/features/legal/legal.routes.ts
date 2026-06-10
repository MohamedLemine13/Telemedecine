import { Routes } from '@angular/router';

export const legalRoutes: Routes = [
  {
    path: 'terms',
    loadComponent: () => import('./terms').then(m => m.Terms),
    data: { title: 'Terms of service' }
  },
  {
    path: 'privacy',
    loadComponent: () => import('./privacy').then(m => m.Privacy),
    data: { title: 'Privacy policy' }
  }
];
