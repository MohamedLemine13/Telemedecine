import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { AppointmentApi, DoctorPatientDto } from '../../../core/api/appointment.api';
import { Card, EmptyState, PageHeader } from '../../../shared/ui';

/**
 * The doctor's patient roster — every distinct person they've had (or will
 * have) an appointment with, aggregated with visit counts and next/last dates.
 */
@Component({
  selector: 'app-doctor-patients',
  standalone: true,
  imports: [DatePipe, Card, EmptyState, PageHeader],
  template: `
    <app-page-header title="My patients"
      subtitle="Everyone you've consulted with, with visit history." />

    <app-card>
      <div class="mb-3 max-w-sm">
        <input type="search" placeholder="Search by name or email…"
          [value]="query()" (input)="query.set($any($event.target).value)"
          class="h-10 w-full rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] px-3 text-sm focus:border-[color:var(--color-primary-700)] focus:outline-none" />
      </div>

      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (visible().length === 0) {
        <app-empty-state icon="👥" title="No patients yet"
          description="Patients appear here after they book an appointment with you." />
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-[color:var(--color-neutral-500)]">
                <th class="py-2 pr-4">Patient</th>
                <th class="py-2 pr-4">Visits</th>
                <th class="py-2 pr-4">Last visit</th>
                <th class="py-2">Next appointment</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--color-neutral-200)]">
              @for (p of visible(); track p.patientId) {
                <tr>
                  <td class="py-3 pr-4">
                    <p class="font-semibold">{{ p.name }}</p>
                    <p class="text-xs text-[color:var(--color-neutral-500)]">{{ p.email }}</p>
                  </td>
                  <td class="py-3 pr-4">{{ p.appointmentCount }}</td>
                  <td class="py-3 pr-4 text-xs text-[color:var(--color-neutral-600)]">
                    {{ p.lastVisitAt ? (p.lastVisitAt | date:'d MMM yyyy') : '—' }}
                  </td>
                  <td class="py-3 text-xs text-[color:var(--color-neutral-600)]">
                    {{ p.nextAppointmentAt ? (p.nextAppointmentAt | date:'d MMM yyyy, HH:mm') : '—' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </app-card>
  `
})
export class DoctorPatients implements OnInit {
  private readonly api = inject(AppointmentApi);

  protected readonly loading = signal(true);
  protected readonly patients = signal<DoctorPatientDto[]>([]);
  protected readonly query = signal('');

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.patients();
    if (!q) return list;
    return list.filter(p =>
      (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.api.myPatients().subscribe({
      next: list => { this.patients.set(list); this.loading.set(false); },
      error: () => { this.patients.set([]); this.loading.set(false); }
    });
  }
}
