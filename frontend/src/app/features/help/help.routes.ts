import { Routes } from '@angular/router';
import { ComingSoon } from '../../shared/route-stub/coming-soon';

export const helpRoutes: Routes = [
  { path: 'faq', component: ComingSoon, data: { title: 'FAQ', phase: 'Phase 6' } }
];
