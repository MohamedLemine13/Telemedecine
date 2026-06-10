import { Routes } from '@angular/router';

import { doctorProfileGuard } from './doctor-profile.guard';

export const doctorRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  // Profile + settings are reachable without a complete profile (onboarding).
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
  // Everything below requires a completed profile (guard redirects to /doctor/profile).
  {
    path: 'dashboard',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('./dashboard/doctor-dashboard').then(m => m.DoctorDashboard),
    data: { title: 'Doctor · Dashboard' }
  },
  {
    path: 'agenda',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('./agenda/doctor-agenda').then(m => m.DoctorAgenda),
    data: { title: 'Agenda' }
  },
  {
    path: 'availability',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('./availability/availability-editor').then(m => m.AvailabilityEditor),
    data: { title: 'Availability' }
  },
  {
    path: 'patients',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('./patients/patients-list').then(m => m.DoctorPatients),
    data: { title: 'My patients' }
  },
  {
    path: 'consultations/:appointmentId',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('../consultation/video-consultation-room').then(m => m.VideoConsultationRoom),
    data: { title: 'Consultation' }
  },
  {
    path: 'prescriptions/new',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('./prescriptions/issue-prescription').then(m => m.IssuePrescription),
    data: { title: 'New prescription' }
  },
  {
    path: 'messages',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('../messaging/messages-page').then(m => m.MessagesPage),
    data: { title: 'Messages' }
  },
  {
    path: 'payouts',
    canActivate: [doctorProfileGuard],
    loadComponent: () => import('./payouts/payouts-page').then(m => m.DoctorPayouts),
    data: { title: 'Payouts' }
  }
];
