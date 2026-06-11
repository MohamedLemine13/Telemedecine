import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AppointmentApi, AppointmentDto, AvailabilityDto, DoctorPatientDto } from '../../../core/api/appointment.api';
import { DoctorApi, DoctorProfileDto } from '../doctor.api';
import { Card, PageHeader } from '../../../shared/ui';

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [Card, RouterLink, DatePipe, TitleCasePipe, PageHeader],
  template: `
    <app-page-header title="Doctor dashboard" subtitle="Today's consultations and your live metrics.">
      @if (profile(); as p) {
        @if (!p.verified) {
          <a actions routerLink="/doctor/profile"
             class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-warning-50)] px-3 h-10 text-xs font-semibold text-[color:var(--color-warning)] hover:opacity-90">
            ⚠ Profile pending verification — upload credentials →
          </a>
        }
      }
      <a actions routerLink="/doctor/agenda"
         class="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 h-10 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
        Open agenda →
      </a>
    </app-page-header>

    <!-- Live KPI strip -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-info) 14%, transparent); color: var(--color-info)">📅</span>
        <div>
          <p class="stat-label">Today</p>
          <p class="stat-value">{{ todays().length }}</p>
          <p class="stat-sub">{{ remainingToday() }} still to come</p>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-primary-700) 14%, transparent); color: var(--color-primary-700)">🗓️</span>
        <div>
          <p class="stat-label">This week</p>
          <p class="stat-value">{{ weekCount() }}</p>
          <p class="stat-sub">scheduled visits</p>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-warning) 16%, transparent); color: var(--color-warning)">👥</span>
        <div>
          <p class="stat-label">Patients</p>
          <p class="stat-value">{{ patients().length }}</p>
          <p class="stat-sub">in your roster</p>
        </div>
      </div>
      <div class="stat">
        <span class="stat-icon" style="background: color-mix(in srgb, var(--color-success) 16%, transparent); color: var(--color-success)">✅</span>
        <div>
          <p class="stat-label">Completed</p>
          <p class="stat-value">{{ completedCount() }}</p>
          <p class="stat-sub">consultations</p>
        </div>
      </div>
    </section>

    <!-- Queue + Availability summary -->
    <section class="mt-6 grid gap-4 lg:grid-cols-3">
      <app-card class="lg:col-span-2">
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Today's schedule</h2>
          <a routerLink="/doctor/agenda" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
            Open agenda
          </a>
        </div>
        @if (loading()) {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
        } @else if (todays().length) {
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[color:var(--color-neutral-200)] text-left">
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Patient</th>
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Reason</th>
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Time</th>
                <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Mode</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              @for (a of todays(); track a.id) {
                <tr class="border-b border-[color:var(--color-neutral-200)] last:border-0">
                  <td class="py-3 font-semibold">{{ a.patient.name || a.patient.email }}</td>
                  <td class="py-3 text-[color:var(--color-neutral-500)]">{{ a.reason || '—' }}</td>
                  <td class="py-3">{{ a.startAt | date:'HH:mm':'UTC' }}</td>
                  <td class="py-3">{{ a.mode | titlecase }}</td>
                  <td class="py-3 text-right">
                    <a [routerLink]="['/doctor/consultations', a.id]"
                       class="rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-3 h-8 inline-flex items-center text-xs font-semibold text-white hover:bg-[color:var(--color-primary-500)]">
                      Start
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">
            Nothing scheduled today. Enjoy the breather ☕
          </p>
        }
      </app-card>

      <app-card>
        <div header><h2 class="text-base font-semibold">Weekly availability</h2></div>
        @if (availability().length) {
          <ul class="space-y-2">
            @for (d of availabilitySummary(); track d.day) {
              <li class="flex items-center justify-between text-sm">
                <span class="font-semibold">{{ d.day }}</span>
                <span class="text-[color:var(--color-neutral-500)]">{{ d.hours }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-sm text-[color:var(--color-neutral-500)]">
            No availability set yet — patients can't book until you add weekly blocks.
          </p>
        }
        <a routerLink="/doctor/availability"
           class="mt-4 inline-block text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">
          Edit availability →
        </a>
      </app-card>
    </section>

    <!-- Next appointments + recent patients -->
    <section class="mt-4 grid gap-4 lg:grid-cols-2">
      <app-card>
        <div header><h2 class="text-base font-semibold">Next appointments</h2></div>
        @if (upcoming().length) {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (a of upcoming().slice(0, 5); track a.id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm font-semibold">{{ a.patient.name || a.patient.email }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ a.startAt | date:'EEE d MMM, HH:mm':'UTC' }}</p>
                </div>
                <span class="text-xs uppercase tracking-wide text-[color:var(--color-primary-700)]">{{ a.mode | titlecase }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">No upcoming appointments.</p>
        }
      </app-card>

      <app-card>
        <div header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Recent patients</h2>
          <a routerLink="/doctor/patients" class="text-xs font-semibold text-[color:var(--color-primary-700)] hover:underline">All</a>
        </div>
        @if (recentPatients().length) {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (p of recentPatients(); track p.patientId) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm font-semibold">{{ p.name || p.email }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ p.appointmentCount }} visit(s)</p>
                </div>
                <span class="text-xs text-[color:var(--color-neutral-500)]">
                  {{ p.lastVisitAt ? (p.lastVisitAt | date:'d MMM') : '—' }}
                </span>
              </li>
            }
          </ul>
        } @else {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">No patients yet.</p>
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
    .stat-value { font-size: 1.5rem; font-weight: 700; margin-top: 2px; line-height: 1.1; }
    .stat-sub { font-size: 0.7rem; color: var(--color-neutral-500); }
  `
})
export class DoctorDashboard implements OnInit {
  private readonly api = inject(DoctorApi);
  private readonly appointments = inject(AppointmentApi);

  protected readonly profile = signal<DoctorProfileDto | null>(null);
  protected readonly scheduled = signal<AppointmentDto[]>([]);
  protected readonly completedCount = signal(0);
  protected readonly patients = signal<DoctorPatientDto[]>([]);
  protected readonly availability = signal<AvailabilityDto[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.api.getMine().subscribe({
      next: p => this.profile.set(p),
      error: () => { /* swallowed — page still works */ }
    });

    forkJoin({
      sched: this.appointments.list({ status: 'SCHEDULED', size: 200 }).pipe(catchError(() => of({ content: [] } as any))),
      done: this.appointments.list({ status: 'COMPLETED', size: 1 }).pipe(catchError(() => of({ totalElements: 0 } as any))),
      pats: this.appointments.myPatients().pipe(catchError(() => of([] as DoctorPatientDto[]))),
      avail: this.appointments.getAvailability().pipe(catchError(() => of([] as AvailabilityDto[])))
    }).subscribe(({ sched, done, pats, avail }) => {
      this.scheduled.set(
        (sched.content as AppointmentDto[]).slice().sort((a, b) => a.startAt.localeCompare(b.startAt))
      );
      this.completedCount.set(done.totalElements ?? 0);
      this.patients.set(pats);
      this.availability.set(avail);
      this.loading.set(false);
    });
  }

  private isToday(iso: string): boolean {
    return new Date(iso).toDateString() === new Date().toDateString();
  }

  protected readonly todays = computed(() => this.scheduled().filter(a => this.isToday(a.startAt)));

  protected readonly remainingToday = computed(() => {
    const now = Date.now();
    return this.todays().filter(a => new Date(a.startAt).getTime() > now).length;
  });

  protected readonly weekCount = computed(() => {
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
    return this.scheduled().filter(a => {
      const t = new Date(a.startAt).getTime();
      return t >= now.getTime() && t <= weekEnd.getTime();
    }).length;
  });

  protected readonly upcoming = computed(() => {
    const now = Date.now();
    return this.scheduled().filter(a => new Date(a.startAt).getTime() > now);
  });

  protected readonly recentPatients = computed(() =>
    this.patients().slice()
      .sort((a, b) => (b.lastVisitAt || '').localeCompare(a.lastVisitAt || ''))
      .slice(0, 5));

  protected readonly availabilitySummary = computed(() => {
    const byDay = new Map<number, AvailabilityDto[]>();
    for (const b of this.availability()) {
      (byDay.get(b.dayOfWeek) ?? byDay.set(b.dayOfWeek, []).get(b.dayOfWeek)!).push(b);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, blocks]) => ({
        day: DAYS[day] ?? `Day ${day}`,
        hours: blocks
          .sort((x, y) => x.startTime.localeCompare(y.startTime))
          .map(b => `${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}`)
          .join(', ')
      }));
  });
}
