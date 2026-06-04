import { Routes } from '@angular/router';
import { ComingSoon } from '../../shared/route-stub/coming-soon';

export const doctorRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/doctor-dashboard').then(m => m.DoctorDashboard),
    data: { title: 'Doctor · Dashboard' }
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/doctor-profile-page').then(m => m.DoctorProfilePage),
    data: { title: 'Public profile' }
  },
  {
    path: 'settings',
    loadComponent: () => import('../settings/settings').then(m => m.Settings),
    data: { title: 'Settings' }
  },
  {
    path: 'agenda',
    loadComponent: () => import('./agenda/doctor-agenda').then(m => m.DoctorAgenda),
    data: { title: 'Agenda' }
  },
  {
    path: 'availability',
    loadComponent: () => import('./availability/availability-editor').then(m => m.AvailabilityEditor),
    data: { title: 'Availability' }
  },
  // ── Coming in Phase 3+ ──
  { path: 'patients',           component: ComingSoon, data: { title: 'My patients',             phase: 'Phase 4' } },
  { path: 'patients/:id',       component: ComingSoon, data: { title: 'Patient record',          phase: 'Phase 3' } },
  {
    path: 'consultations/:appointmentId',
    loadComponent: () => import('../consultation/video-consultation-room').then(m => m.VideoConsultationRoom),
    data: { title: 'Consultation' }
  },
  { path: 'prescriptions/new',  component: ComingSoon, data: { title: 'New prescription',        phase: 'Phase 5' } },
  { path: 'prescriptions/:id',  component: ComingSoon, data: { title: 'Prescription',            phase: 'Phase 5' } },
  { path: 'messages',           component: ComingSoon, data: { title: 'Messages',                phase: 'Phase 4' } },
  { path: 'payouts',            component: ComingSoon, data: { title: 'Payouts',                 phase: 'Phase 5' } }
];
