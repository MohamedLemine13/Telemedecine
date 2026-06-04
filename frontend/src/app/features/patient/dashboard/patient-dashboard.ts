import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppointmentApi, AppointmentDto } from '../../../core/api/appointment.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { Card, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

interface ActivePrescription {
  id: string;
  medication: string;
  dosage: string;
  doctor: string;
  endsOnLabel: string;
}

interface Transaction {
  id: string;
  label: string;
  amount: string;
  status: 'PAID' | 'PENDING' | 'REFUNDED';
  dateLabel: string;
}

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [Card, RouterLink, DatePipe, TitleCasePipe, PageHeader, StatusBadge],
  template: `
    <app-page-header [title]="'Hello' + greeting()" subtitle="Here's a quick look at your health space.">
      <a actions routerLink="/patient/doctors"
         class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 h-10 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
        + Find a doctor
      </a>
    </app-page-header>

    <!-- Quick actions -->
    <section class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <a routerLink="/patient/doctors"
         class="rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] bg-[color:var(--color-neutral-0)] p-4 text-center hover:shadow-[var(--shadow-2)] transition-shadow">
        <p class="text-2xl">👩‍⚕️</p>
        <p class="mt-1 text-sm font-semibold">Find a doctor</p>
      </a>
      <a routerLink="/patient/appointments"
         class="rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] bg-[color:var(--color-neutral-0)] p-4 text-center hover:shadow-[var(--shadow-2)] transition-shadow">
        <p class="text-2xl">📅</p>
        <p class="mt-1 text-sm font-semibold">Appointments</p>
      </a>
      <a routerLink="/patient/medical-record"
         class="rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] bg-[color:var(--color-neutral-0)] p-4 text-center hover:shadow-[var(--shadow-2)] transition-shadow">
        <p class="text-2xl">📋</p>
        <p class="mt-1 text-sm font-semibold">Medical record</p>
      </a>
      <a routerLink="/patient/prescriptions"
         class="rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] bg-[color:var(--color-neutral-0)] p-4 text-center hover:shadow-[var(--shadow-2)] transition-shadow">
        <p class="text-2xl">💊</p>
        <p class="mt-1 text-sm font-semibold">Prescriptions</p>
      </a>
    </section>

    <!-- Two-column main: Upcoming appointments + Active prescriptions -->
    <section class="grid gap-4 lg:grid-cols-3">
      <!-- Upcoming -->
      <app-card class="lg:col-span-2">
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Upcoming appointments</h2>
          <a routerLink="/patient/appointments" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
            View all
          </a>
        </div>
        @if (loadingAppts()) {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
        } @else if (upcoming().length) {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (a of upcoming(); track a.id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm font-semibold">{{ a.doctor.name || a.doctor.email }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ a.startAt | date:'EEE d MMM, HH:mm':'UTC' }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs uppercase tracking-wide text-[color:var(--color-primary-700)]">{{ a.mode | titlecase }} consult</p>
                </div>
              </li>
            }
          </ul>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">
            No upcoming appointments. <a routerLink="/patient/doctors" class="text-[color:var(--color-primary-700)] hover:underline">Find a doctor</a>.
          </p>
        }
      </app-card>

      <!-- Prescriptions -->
      <app-card>
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Active prescriptions</h2>
        </div>
        @if (prescriptions.length) {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (p of prescriptions; track p.id) {
              <li class="py-3">
                <p class="text-sm font-semibold">{{ p.medication }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">{{ p.dosage }} · {{ p.doctor }}</p>
                <p class="mt-1 text-xs text-[color:var(--color-warning)]">{{ p.endsOnLabel }}</p>
              </li>
            }
          </ul>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">No active prescriptions.</p>
        }
      </app-card>
    </section>

    <!-- Recent transactions -->
    <section class="mt-4">
      <app-card>
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Recent transactions</h2>
          <a routerLink="/patient/payments" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
            Payments
          </a>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[color:var(--color-neutral-200)] text-left">
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Service</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Amount</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Status</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Date</th>
            </tr>
          </thead>
          <tbody>
            @for (t of transactions; track t.id) {
              <tr class="border-b border-[color:var(--color-neutral-200)] last:border-0">
                <td class="py-3">{{ t.label }}</td>
                <td class="py-3 font-semibold">{{ t.amount }}</td>
                <td class="py-3">
                  <app-status-badge [variant]="badgeVariant(t.status)" [label]="t.status" />
                </td>
                <td class="py-3 text-[color:var(--color-neutral-500)]">{{ t.dateLabel }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="mt-3 text-xs italic text-[color:var(--color-neutral-500)]">
          Mock payment data — real billing lands in Phase 5.
        </p>
      </app-card>
    </section>
  `
})
export class PatientDashboard implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly appointments = inject(AppointmentApi);

  protected readonly upcoming = signal<AppointmentDto[]>([]);
  protected readonly loadingAppts = signal(true);

  ngOnInit(): void {
    this.appointments.list({ status: 'SCHEDULED', size: 50 }).subscribe({
      next: page => {
        const now = Date.now();
        this.upcoming.set(
          page.content
            .filter(a => new Date(a.startAt).getTime() > now)
            .sort((x, y) => x.startAt.localeCompare(y.startAt))
            .slice(0, 4)
        );
        this.loadingAppts.set(false);
      },
      error: () => this.loadingAppts.set(false)
    });
  }

  greeting(): string {
    const email = this.auth.user()?.email;
    if (!email) return '';
    const local = email.split('@')[0];
    return ', ' + local.charAt(0).toUpperCase() + local.slice(1);
  }

  badgeVariant(status: Transaction['status']): StatusVariant {
    if (status === 'PAID')     return 'success';
    if (status === 'PENDING')  return 'warning';
    if (status === 'REFUNDED') return 'neutral';
    return 'neutral';
  }

  // Mock data — prescriptions + transactions are wired in Phase 5.
  prescriptions: ActivePrescription[] = [
    { id: '1', medication: 'Amoxicillin 500 mg', dosage: '1 tab · 3×/day', doctor: 'Dr. Sow',    endsOnLabel: '4 days left' },
    { id: '2', medication: 'Ibuprofen 200 mg',   dosage: 'As needed',      doctor: 'Dr. Diallo', endsOnLabel: 'Refill soon' }
  ];

  transactions: Transaction[] = [
    { id: '1', label: 'Video consultation · Dr. Sow',    amount: '500 UM', status: 'PAID',    dateLabel: '2026-05-12' },
    { id: '2', label: 'Prescription dispatch · Pharm.',  amount: '120 UM', status: 'PENDING', dateLabel: '2026-05-18' },
    { id: '3', label: 'Refund · cancelled appointment',  amount: '500 UM', status: 'REFUNDED',dateLabel: '2026-05-05' }
  ];
}
