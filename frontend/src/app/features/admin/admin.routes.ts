import { Routes } from '@angular/router';
import { ComingSoon } from '../../shared/route-stub/coming-soon';

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/admin-dashboard').then(m => m.AdminDashboard),
    data: { title: 'Admin · Dashboard' }
  },
  {
    path: 'verifications',
    loadComponent: () => import('./verifications/verifications-list').then(m => m.VerificationsList),
    data: { title: 'Doctor verifications' }
  },
  {
    path: 'verifications/:id',
    loadComponent: () => import('./verifications/verification-detail').then(m => m.VerificationDetail),
    data: { title: 'Verification detail' }
  },
  {
    path: 'settings',
    loadComponent: () => import('../settings/settings').then(m => m.Settings),
    data: { title: 'Settings' }
  },
  // ── Coming in Phase 6 ──
  { path: 'accounts',      component: ComingSoon, data: { title: 'Accounts',         phase: 'Phase 6' } },
  { path: 'accounts/:id',  component: ComingSoon, data: { title: 'Account detail',   phase: 'Phase 6' } },
  { path: 'disputes',      component: ComingSoon, data: { title: 'Disputes',         phase: 'Phase 6' } },
  { path: 'disputes/:id',  component: ComingSoon, data: { title: 'Dispute detail',   phase: 'Phase 6' } },
  { path: 'content',       component: ComingSoon, data: { title: 'CMS · Content',    phase: 'Phase 6' } },
  { path: 'content/:slug', component: ComingSoon, data: { title: 'Edit content',     phase: 'Phase 6' } },
  { path: 'reports',       component: ComingSoon, data: { title: 'Reports',          phase: 'Phase 6' } },
  { path: 'audit',         component: ComingSoon, data: { title: 'Audit log',        phase: 'Phase 6' } }
];
