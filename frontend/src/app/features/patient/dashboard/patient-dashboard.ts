import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AppointmentApi, AppointmentDto } from '../../../core/api/appointment.api';
import { InvoiceApi, InvoiceDto, PaymentSummaryDto } from '../../../core/api/invoice.api';
import { PrescriptionApi, PrescriptionDto } from '../../../core/api/prescription.api';
import { AuthStore } from '../../../core/auth/auth.store';
import { LocaleService } from '../../../core/i18n/locale.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { Card, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [Card, RouterLink, DatePipe, TitleCasePipe, CurrencyPipe, PageHeader, StatusBadge, TranslatePipe],
  template: `
    <app-page-header [title]="locale.t('pd.hello') + greeting()" [subtitle]="locale.t('pd.subtitle')">
      <a actions routerLink="/patient/doctors"
         class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 h-10 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
        {{ 'pd.findDoctor' | t }}
      </a>
    </app-page-header>

    <!-- Stat strip (live) -->
    <section class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-info) 14%, transparent); color: var(--color-info)">📅</span>
        <div>
          <p class="stat-label">{{ 'pd.stat.upcoming' | t }}</p>
          <p class="stat-value">{{ upcoming().length }}</p>
          <p class="stat-sub">{{ 'pd.stat.upcomingSub' | t }}</p>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-primary-700) 14%, transparent); color: var(--color-primary-700)">💊</span>
        <div>
          <p class="stat-label">{{ 'pd.stat.prescriptions' | t }}</p>
          <p class="stat-value">{{ prescriptions().length }}</p>
          <p class="stat-sub">{{ 'pd.stat.prescriptionsSub' | t }}</p>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-warning) 16%, transparent); color: var(--color-warning)">💳</span>
        <div>
          <p class="stat-label">{{ 'pd.stat.due' | t }}</p>
          <p class="stat-value">{{ (summary()?.totalBilled || 0) - (summary()?.totalPaid || 0) | currency:currency():'symbol':'1.0-0' }}</p>
          <p class="stat-sub">{{ summary()?.pendingInvoices || 0 }} {{ 'pd.stat.duePending' | t }}</p>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-success) 16%, transparent); color: var(--color-success)">↩️</span>
        <div>
          <p class="stat-label">{{ 'pd.stat.reimbursed' | t }}</p>
          <p class="stat-value">{{ summary()?.totalReimbursed || 0 | currency:currency():'symbol':'1.0-0' }}</p>
          <p class="stat-sub">{{ 'pd.stat.reimbursedSub' | t }}</p>
        </div>
      </div>
    </section>

    <!-- Quick actions -->
    <section class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      @for (q of quickActions; track q.link) {
        <a [routerLink]="q.link"
           class="rounded-[var(--radius-card)] border border-[color:var(--color-neutral-200)] bg-[color:var(--color-neutral-0)] p-4 text-center hover:shadow-[var(--shadow-2)] transition-shadow">
          <p class="text-2xl">{{ q.icon }}</p>
          <p class="mt-1 text-sm font-semibold">{{ q.key | t }}</p>
        </a>
      }
    </section>

    <!-- Two-column main: Upcoming appointments + Active prescriptions -->
    <section class="grid gap-4 lg:grid-cols-3">
      <app-card class="lg:col-span-2">
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ 'pd.upcoming' | t }}</h2>
          <a routerLink="/patient/appointments" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
            {{ 'common.viewAll' | t }}
          </a>
        </div>
        @if (loading()) {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
        } @else if (upcoming().length) {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (a of upcoming(); track a.id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm font-semibold">{{ a.doctor.name || a.doctor.email }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ a.startAt | date:'EEE d MMM, HH:mm':'UTC' }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs uppercase tracking-wide text-[color:var(--color-primary-700)]">{{ a.mode | titlecase }}</span>
                  <a [routerLink]="['/patient/consultations', a.id]"
                     class="rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-3 h-8 inline-flex items-center text-xs font-semibold text-white hover:bg-[color:var(--color-primary-500)]">
                    Join
                  </a>
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

      <app-card>
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ 'pd.recentPrescriptions' | t }}</h2>
          <a routerLink="/patient/prescriptions" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">{{ 'common.all' | t }}</a>
        </div>
        @if (loading()) {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
        } @else if (prescriptions().length) {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (p of prescriptions().slice(0, 4); track p.id) {
              <li class="py-3">
                <p class="text-sm font-semibold">{{ p.title }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">{{ p.doctorName }} · {{ p.issuedAt | date:'d MMM yyyy' }}</p>
              </li>
            }
          </ul>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">
            No prescriptions yet. They appear here after a consultation.
          </p>
        }
      </app-card>
    </section>

    <!-- Recent invoices (live) -->
    <section class="mt-4">
      <app-card>
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">{{ 'pd.transactions' | t }}</h2>
          <a routerLink="/patient/payments" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
            {{ 'nav.payments' | t }}
          </a>
        </div>
        @if (invoices().length) {
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[color:var(--color-neutral-200)] text-left">
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">{{ 'pd.col.doctor' | t }}</th>
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">{{ 'pd.col.amount' | t }}</th>
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">{{ 'pd.col.status' | t }}</th>
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">{{ 'pd.col.date' | t }}</th>
              </tr>
            </thead>
            <tbody>
              @for (t of invoices().slice(0, 5); track t.id) {
                <tr class="border-b border-[color:var(--color-neutral-200)] last:border-0">
                  <td class="py-3">{{ t.doctorName }}</td>
                  <td class="py-3 font-semibold">{{ t.amount | currency:t.currency:'symbol':'1.0-0' }}</td>
                  <td class="py-3"><app-status-badge [variant]="badgeVariant(t.status)" [label]="t.status" /></td>
                  <td class="py-3 text-[color:var(--color-neutral-500)]">{{ t.issuedAt | date:'d MMM yyyy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">
            No transactions yet — invoices are raised after a completed consultation.
          </p>
        }
      </app-card>
    </section>
  `,
  styles: `
    .stat { display: flex; align-items: center; gap: 12px; border: 1px solid var(--color-neutral-200);
            border-radius: var(--radius-card); background: var(--color-neutral-0); padding: 14px 16px; }
    .stat-icon { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; display: grid;
                 place-items: center; font-size: 1.2rem; }
    .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: .04em; color: var(--color-neutral-500); }
    .stat-value { font-size: 1.4rem; font-weight: 700; margin-top: 2px; line-height: 1.1; }
    .stat-sub { font-size: 0.7rem; color: var(--color-neutral-500); }
  `
})
export class PatientDashboard implements OnInit {
  private readonly auth = inject(AuthStore);
  protected readonly locale = inject(LocaleService);
  private readonly appointments = inject(AppointmentApi);
  private readonly prescriptionApi = inject(PrescriptionApi);
  private readonly invoiceApi = inject(InvoiceApi);

  protected readonly upcoming = signal<AppointmentDto[]>([]);
  protected readonly prescriptions = signal<PrescriptionDto[]>([]);
  protected readonly invoices = signal<InvoiceDto[]>([]);
  protected readonly summary = signal<PaymentSummaryDto | null>(null);
  protected readonly loading = signal(true);

  protected readonly currency = computed(() => this.summary()?.currency || 'MRU');

  protected readonly quickActions = [
    { icon: '👩‍⚕️', key: 'pd.action.findDoctor',     link: '/patient/doctors' },
    { icon: '📅', key: 'pd.action.appointments',   link: '/patient/appointments' },
    { icon: '📋', key: 'pd.action.medicalRecord',  link: '/patient/medical-record' },
    { icon: '💬', key: 'pd.action.messages',       link: '/patient/messages' }
  ];

  ngOnInit(): void {
    forkJoin({
      appts: this.appointments.list({ status: 'SCHEDULED', size: 50 }).pipe(catchError(() => of({ content: [] } as any))),
      pres: this.prescriptionApi.list().pipe(catchError(() => of([] as PrescriptionDto[]))),
      inv: this.invoiceApi.list().pipe(catchError(() => of([] as InvoiceDto[]))),
      sum: this.invoiceApi.summary().pipe(catchError(() => of(null)))
    }).subscribe(({ appts, pres, inv, sum }) => {
      const now = Date.now();
      this.upcoming.set(
        (appts.content as AppointmentDto[])
          .filter(a => new Date(a.startAt).getTime() > now)
          .sort((x, y) => x.startAt.localeCompare(y.startAt))
          .slice(0, 5)
      );
      this.prescriptions.set([...pres].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)));
      this.invoices.set([...inv].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)));
      this.summary.set(sum);
      this.loading.set(false);
    });
  }

  greeting(): string {
    const email = this.auth.user()?.email;
    if (!email) return '';
    const local = email.split('@')[0];
    return ', ' + local.charAt(0).toUpperCase() + local.slice(1);
  }

  badgeVariant(status: InvoiceDto['status']): StatusVariant {
    if (status === 'PAID')       return 'success';
    if (status === 'PENDING')    return 'warning';
    if (status === 'REIMBURSED') return 'info';
    return 'neutral';
  }
}
