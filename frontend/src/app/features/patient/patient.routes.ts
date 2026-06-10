import { Routes } from '@angular/router';

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
  {
    path: 'doctors/:id',
    loadComponent: () => import('./doctor-detail/doctor-detail').then(m => m.DoctorDetail),
    data: { title: 'Doctor profile' }
  },
  {
    path: 'appointments',
    loadComponent: () => import('./appointments/appointments-list').then(m => m.PatientAppointments),
    data: { title: 'My appointments' }
  },
  {
    path: 'consultations/:appointmentId',
    loadComponent: () => import('../consultation/video-consultation-room').then(m => m.VideoConsultationRoom),
    data: { title: 'Consultation' }
  },
  {
    path: 'prescriptions',
    loadComponent: () => import('./prescriptions/prescriptions-list').then(m => m.PatientPrescriptions),
    data: { title: 'Prescriptions' }
  },
  {
    path: 'messages',
    loadComponent: () => import('../messaging/messages-page').then(m => m.MessagesPage),
    data: { title: 'Messages' }
  },
  {
    path: 'payments',
    loadComponent: () => import('./payments/payments-page').then(m => m.PatientPayments),
    data: { title: 'Payments' }
  }
];
