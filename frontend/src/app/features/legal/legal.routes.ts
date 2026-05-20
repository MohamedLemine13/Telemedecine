import { Routes } from '@angular/router';
import { ComingSoon } from '../../shared/route-stub/coming-soon';

export const legalRoutes: Routes = [
  { path: 'terms',   component: ComingSoon, data: { title: 'Terms of service', phase: 'Phase 6' } },
  { path: 'privacy', component: ComingSoon, data: { title: 'Privacy policy',   phase: 'Phase 6' } }
];
