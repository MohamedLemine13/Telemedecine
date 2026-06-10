import { Routes } from '@angular/router';

export const helpRoutes: Routes = [
  {
    path: 'faq',
    loadComponent: () => import('./faq').then(m => m.Faq),
    data: { title: 'FAQ' }
  }
];
