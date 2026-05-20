import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { rootRedirectGuard } from './core/auth/root-redirect.guard';

/**
 * Top-level route tree. Each role-space lazy-loads its own children file and
 * sits behind its own shell. Guards are intentionally permissive in Phase 0
 * (the AuthStore is in mock mode); Phase 1 wires real JWT-backed checks.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [rootRedirectGuard],
    children: []
  },
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-shell/auth-shell').then(m => m.AuthShell),
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard('PATIENT')],
    loadComponent: () => import('./layouts/patient-shell/patient-shell').then(m => m.PatientShell),
    loadChildren: () => import('./features/patient/patient.routes').then(m => m.patientRoutes)
  },
  {
    path: 'doctor',
    canActivate: [authGuard, roleGuard('DOCTOR')],
    loadComponent: () => import('./layouts/doctor-shell/doctor-shell').then(m => m.DoctorShell),
    loadChildren: () => import('./features/doctor/doctor.routes').then(m => m.doctorRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('ADMIN')],
    loadComponent: () => import('./layouts/admin-shell/admin-shell').then(m => m.AdminShell),
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'legal',
    loadChildren: () => import('./features/legal/legal.routes').then(m => m.legalRoutes)
  },
  {
    path: 'help',
    loadChildren: () => import('./features/help/help.routes').then(m => m.helpRoutes)
  },
  { path: 'forbidden', loadComponent: () => import('./features/errors/forbidden').then(m => m.Forbidden) },
  { path: '**',        loadComponent: () => import('./features/errors/not-found').then(m => m.NotFound) }
];
