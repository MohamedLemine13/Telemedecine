import { Routes } from '@angular/router';
import { ComingSoon } from '../../shared/route-stub/coming-soon';

export const patientRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/patient-dashboard').then(m => m.PatientDashboard),
    data: { title: 'Patient · Dashboard' }
  },
  {
    path: 'doctors',
    loadComponent: () => import('./doctors-search/doctors-search').then(m => m.DoctorsSearch),
    data: { title: 'Find a doctor' }
  },
  {
    path: 'medical-record',
    loadComponent: () => import('./medical-record/medical-record').then(m => m.MedicalRecord),
    data: { title: 'Medical record' }
  },
  {
    path: 'settings',
    loadComponent: () => import('../settings/settings').then(m => m.Settings),
    data: { title: 'Settings' }
  },
  // ── Coming in Phase 3+ ──
  { path: 'doctors/:id',        component: ComingSoon, data: { title: 'Doctor profile',     phase: 'Phase 3' } },
  { path: 'appointments',       component: ComingSoon, data: { title: 'My appointments',    phase: 'Phase 3' } },
  { path: 'appointments/:id',   component: ComingSoon, data: { title: 'Appointment detail', phase: 'Phase 3' } },
  { path: 'consultations/:id',  component: ComingSoon, data: { title: 'Video consultation', phase: 'Phase 4' } },
  { path: 'prescriptions',      component: ComingSoon, data: { title: 'Prescriptions',      phase: 'Phase 5' } },
  { path: 'prescriptions/:id',  component: ComingSoon, data: { title: 'Prescription',       phase: 'Phase 5' } },
  { path: 'messages',           component: ComingSoon, data: { title: 'Messages',           phase: 'Phase 4' } },
  { path: 'messages/:threadId', component: ComingSoon, data: { title: 'Message thread',     phase: 'Phase 4' } },
  { path: 'payments',           component: ComingSoon, data: { title: 'Payments',           phase: 'Phase 5' } }
];
