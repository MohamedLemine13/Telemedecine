import { Routes } from '@angular/router';

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
    path: 'accounts',
    loadComponent: () => import('./accounts/accounts-list').then(m => m.AdminAccounts),
    data: { title: 'Accounts' }
  },
  {
    path: 'reimbursements',
    loadComponent: () => import('./reimbursements/reimbursements-page').then(m => m.AdminReimbursements),
    data: { title: 'Reimbursement claims' }
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/reports-page').then(m => m.AdminReports),
    data: { title: 'Reports' }
  },
  {
    path: 'settings',
    loadComponent: () => import('../settings/settings').then(m => m.Settings),
    data: { title: 'Settings' }
  }
];
